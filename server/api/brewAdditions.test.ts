import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import { brewsRouter } from "./brews.js";
import { Brew } from "../mongo/models/Brew.js";
import { Brewer } from "../mongo/models/Brewer.js";
test("addition acknowledgements are atomic, owner scoped and preserved across pause/reset", async () => {
  const brewerId = new mongoose.Types.ObjectId();
  const originals = [Brew.findOne, Brew.findOneAndUpdate, Brewer.findOne];
  const brew = new Brew({
    brewerId,
    name: "Boil",
    status: "active",
    recipeSnapshot: {
      steps: [
        {
          stepId: "boil",
          order: 1,
          stepType: "boil",
          title: "Boil",
          durationMinutes: 60,
          data: {
            additions: [
              { additionId: "hop", name: "Saaz", remainingMinutes: 15 },
              { additionId: "fining", name: "Whirlfloc", remainingMinutes: 15 },
            ],
          },
        },
      ],
    },
    progress: {
      stepProgress: [
        {
          stepId: "boil",
          status: "active",
          startedAt: new Date(),
          timerEndsAt: new Date(Date.now() + 1800000),
        },
      ],
    },
  });
  let owner = brewerId;
  Brewer.findOne = async () => ({ _id: owner });
  Brew.findOne = async (filter: any) =>
    String(filter.brewerId) === String(brewerId) ? brew : null;
  Brew.findOneAndUpdate = async (filter: any, update: any, options: any) => {
    assert.equal(String(filter.brewerId), String(brewerId));
    assert.equal(options.runValidators, true);
    assert.equal(filter["progress.stepProgress"].$elemMatch.stepId, "boil");
    const entry = brew.progress.stepProgress[0];
    if (entry.status === "completed") return null;
    const ids = new Set(entry.completedAdditionIds);
    const path = "progress.stepProgress.$.completedAdditionIds";
    if (update.$addToSet) ids.add(update.$addToSet[path]);
    else ids.delete(update.$pull[path]);
    entry.completedAdditionIds = [...ids];
    return brew;
  };
  brew.save = async () => brew;
  const app = express();
  app.use(express.json());
  app.use("/api/brews", brewsRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address: any = server.address();
  const request = async (path: string, body: any = {}, method = "PATCH") => {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/brews/${brew._id}/steps/boil/${path}`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return { status: response.status, body: await response.json() };
  };
  try {
    await Promise.all([
      request("additions/hop", { completed: true }),
      request("additions/fining", { completed: true }),
    ]);
    assert.deepEqual(
      [...brew.progress.stepProgress[0].completedAdditionIds].sort(),
      ["fining", "hop"],
    );
    assert.equal(
      (await request("additions/hop", { completed: "true" })).status,
      400,
    );
    assert.equal(
      (await request("additions/unknown", { completed: true })).status,
      404,
    );
    await request("additions/hop", { completed: true });
    assert.equal(brew.progress.stepProgress[0].completedAdditionIds.length, 2);
    await request("additions/hop", { completed: false });
    assert.deepEqual(
      [...brew.progress.stepProgress[0].completedAdditionIds],
      ["fining"],
    );
    assert.equal((await request("pause", {}, "POST")).status, 200);
    assert.deepEqual(
      [...brew.progress.stepProgress[0].completedAdditionIds],
      ["fining"],
    );
    assert.equal((await request("reset", {}, "POST")).status, 200);
    assert.deepEqual(
      [...brew.progress.stepProgress[0].completedAdditionIds],
      [],
    );
    owner = new mongoose.Types.ObjectId();
    assert.equal(
      (await request("additions/hop", { completed: true })).status,
      404,
    );
    owner = brewerId;
    brew.status = "completed";
    assert.equal(
      (await request("additions/hop", { completed: true })).status,
      400,
    );
  } finally {
    [Brew.findOne, Brew.findOneAndUpdate, Brewer.findOne] = originals;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
