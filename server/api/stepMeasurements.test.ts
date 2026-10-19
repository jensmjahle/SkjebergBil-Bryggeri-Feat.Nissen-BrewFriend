import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import { brewsRouter } from "./brews.js";
import { Brew } from "../mongo/models/Brew.js";
import { Brewer } from "../mongo/models/Brewer.js";

test("actual step volumes persist, can be cleared and do not change recipe targets or other readings", async () => {
  const originalBrew = Brew.findOne,
    originalBrewer = Brewer.findOne;
  const brewerId = new mongoose.Types.ObjectId();
  const brew = new Brew({
    brewerId,
    name: "Test",
    status: "active",
    recipeSnapshot: {
      defaults: { batchSizeLiters: 25 },
      steps: [
        {
          stepId: "boil",
          order: 1,
          stepType: "boil",
          title: "Koking",
          durationMinutes: 60,
        },
        { stepId: "sparge", order: 2, stepType: "sparge", title: "Skylling" },
      ],
    },
    measurements: [{ gravity: 1.012 }],
  });
  brew.save = async () => {
    await brew.validate();
    return brew;
  };
  Brewer.findOne = async () => ({ _id: brewerId });
  Brew.findOne = async (filter: any) =>
    String(filter._id) === String(brew._id) &&
    String(filter.brewerId) === String(brewerId)
      ? brew
      : null;
  const app = express();
  app.use(express.json());
  app.use("/api/brews", brewsRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.on("listening", r));
  const address: any = server.address();
  const send = async (path: string, method: string, payload: any) => {
    const res = await fetch(
      `http://127.0.0.1:${address.port}/api/brews/${brew._id}/measurements${path}`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    return { status: res.status, body: await res.json() };
  };
  try {
    const result = await send("", "POST", {
      stepId: "boil",
      preBoilVolumeLiters: 30,
      postBoilVolumeLiters: 25,
      preBoilGravity: 1.045,
      og: 1.054,
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.preBoilVolumeLiters, 30);
    assert.equal(result.body.stepId, "boil");
    const id = result.body._id;
    const cleared = await send(`/${id}`, "PATCH", {
      stepId: "boil",
      postBoilVolumeLiters: null,
      preBoilVolumeLiters: 0,
    });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.postBoilVolumeLiters, undefined);
    assert.equal(cleared.body.preBoilVolumeLiters, 0);
    assert.equal(cleared.body.og, 1.054);
    assert.equal(
      (await send(`/${id}`, "PATCH", { stepId: "sparge" })).status,
      400,
    );
    assert.equal(
      (await send("", "POST", { stepId: "missing", volumeLiters: 20 })).status,
      400,
    );
    for (const value of [-1, "abc", {}, "25"])
      assert.equal(
        (await send("", "POST", { stepId: "boil", preBoilVolumeLiters: value }))
          .status,
        400,
      );
    const sparge = await send("", "POST", {
      stepId: "sparge",
      waterVolumeLiters: 16,
      volumeLiters: 30,
      temperatureC: 76,
      sg: 1.044,
    });
    assert.equal(sparge.status, 201);
    assert.equal(sparge.body.waterVolumeLiters, 16);
    assert.equal(brew.recipeSnapshot.defaults.batchSizeLiters, 25);
    assert.equal(brew.measurements[0].gravity, 1.012);
    assert.equal(
      (
        await send("/" + new mongoose.Types.ObjectId(), "PATCH", {
          volumeLiters: 20,
        })
      ).status,
      404,
    );
  } finally {
    Brew.findOne = originalBrew;
    Brewer.findOne = originalBrewer;
    await new Promise<void>((r) => server.close(() => r()));
  }
});
