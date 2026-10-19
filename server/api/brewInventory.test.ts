import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import { brewsRouter } from "./brews.js";
import { Brew } from "../mongo/models/Brew.js";
import { Brewer } from "../mongo/models/Brewer.js";

test("inventory persists independently, validates inputs and respects brew ownership", async () => {
  const brewerId = new mongoose.Types.ObjectId();
  const original = [Brew.findOneAndUpdate, Brewer.findOne];
  const brew = new Brew({
    brewerId,
    name: "Plan",
    status: "planned",
    recipeSnapshot: {
      name: "Pils",
      ingredients: [
        { ingredientId: "malt", name: "Malt" },
        { ingredientId: "hops", name: "Hops" },
      ],
    },
  });
  const snapshot = brew.recipeSnapshot.toObject();
  const inventory = new Set<string>();
  let owner = brewerId;
  Brewer.findOne = async () => ({ _id: owner });
  Brew.findOneAndUpdate = async (filter: any, update: any, options: any) => {
    assert.equal(options.runValidators, true);
    if (
      String(filter._id) !== String(brew._id) ||
      String(filter.brewerId) !== String(brewerId) ||
      !["malt", "hops"].includes(
        filter["recipeSnapshot.ingredients.ingredientId"],
      )
    )
      return null;
    if (update.$addToSet)
      inventory.add(update.$addToSet["inventory.availableIngredientIds"]);
    else inventory.delete(update.$pull["inventory.availableIngredientIds"]);
    brew.inventory = { availableIngredientIds: [...inventory] };
    return brew;
  };
  const app = express();
  app.use(express.json());
  app.use("/api/brews", brewsRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address: any = server.address();
  const request = async (payload: any) => {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/brews/${brew._id}/inventory`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    return { status: response.status, body: await response.json() };
  };
  try {
    await Promise.all([
      request({ ingredientId: "malt", available: true }),
      request({ ingredientId: "hops", available: true }),
    ]);
    assert.deepEqual([...inventory].sort(), ["hops", "malt"]);
    await request({ ingredientId: "malt", available: true });
    assert.equal(inventory.size, 2);
    const unchecked = await request({ ingredientId: "malt", available: false });
    assert.equal(unchecked.status, 200);
    assert.deepEqual(unchecked.body.inventory.availableIngredientIds, ["hops"]);
    assert.deepEqual(brew.recipeSnapshot.toObject(), snapshot);
    assert.equal(brew.batchNumber, undefined);
    assert.equal(
      (await request({ ingredientId: "hops", available: "yes" })).status,
      400,
    );
    assert.equal((await request({ available: true })).status, 400);
    assert.equal(
      (await request({ ingredientId: "unknown", available: true })).status,
      404,
    );
    owner = new mongoose.Types.ObjectId();
    assert.equal(
      (await request({ ingredientId: "hops", available: false })).status,
      404,
    );
    assert.deepEqual([...inventory], ["hops"]);
  } finally {
    [Brew.findOneAndUpdate, Brewer.findOne] = original;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
