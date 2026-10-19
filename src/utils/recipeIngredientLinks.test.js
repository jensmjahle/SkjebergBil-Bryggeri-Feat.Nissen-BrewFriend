import { test } from "node:test";
import assert from "node:assert/strict";
import { detachBoilIngredient } from "./recipeIngredientLinks.js";

test("deleting an ingredient preserves scheduled quantities, overrides and event IDs", () => {
  const other = { additionId: "other", ingredientId: "other" };
  const steps = [{ data: { additions: [
    { additionId: "first", ingredientId: "hop", name: "Old name", remainingMinutes: 15 },
    { additionId: "second", ingredientId: "hop", remainingMinutes: 5, amount: "10", unit: "mg" },
    other,
  ] } }, { data: { hopSchedule: "legacy" } }];
  detachBoilIngredient(steps, { ingredientId: "hop", name: "Cascade", amount: "30", unit: "g" });
  assert.deepEqual(steps[0].data.additions[0], { additionId: "first", name: "Cascade", remainingMinutes: 15, amount: "30", unit: "g" });
  assert.deepEqual(steps[0].data.additions[1], { additionId: "second", name: "Cascade", remainingMinutes: 5, amount: "10", unit: "mg" });
  assert.equal(steps[0].data.additions[2], other);
  assert.equal(steps[1].data.hopSchedule, "legacy");
});
