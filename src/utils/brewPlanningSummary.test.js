import test from "node:test";
import assert from "node:assert/strict";
import { brewPlanningSummary, gravityRangeError } from "./brewPlanningSummary.js";

test("gravity ranges are independently optional, complete, formatted and ordered", () => {
  assert.equal(gravityRangeError('', ''), null);
  assert.equal(gravityRangeError('1.048', '1.052'), null);
  assert.equal(gravityRangeError('1.050', '1.050'), null);
  assert.equal(gravityRangeError('1.048', ''), 'incomplete');
  assert.equal(gravityRangeError('', '1.052'), 'incomplete');
  assert.equal(gravityRangeError('1.05', '1.052'), 'format');
  assert.equal(gravityRangeError('abc', '1.052'), 'format');
  assert.equal(gravityRangeError('1.052', '1.048'), 'order');
});

test("mash and boil totals combine all applicable steps without fermentation or invalid time", () => {
  const summary = brewPlanningSummary({
    steps: [
      { stepType: "mash", durationMinutes: 45 },
      { stepType: "custom", phase: "mash", durationMinutes: 15 },
      { stepType: "boil", durationMinutes: 60 },
      { stepType: "boil", durationMinutes: -5 },
      { stepType: "boil", durationMinutes: "oops" },
      { stepType: "primary_fermentation", durationMinutes: 10080 },
    ],
  });
  assert.equal(summary.mashMinutes, 60);
  assert.equal(summary.boilMinutes, 60);
});

test("inventory counts real ingredients once, ignoring stale and repeated checkmarks", () => {
  const snapshot = {
    ingredients: [
      { ingredientId: "malt", name: "Malt" },
      { ingredientId: "hop", name: "Hops" },
      { ingredientId: "draft", name: "" },
    ],
  };
  const partial = brewPlanningSummary(snapshot, ["malt", "malt", "deleted"]);
  assert.equal(partial.availableCount, 1);
  assert.equal(partial.missingCount, 1);
  assert.equal(partial.inventoryPercent, 50);
  assert.equal(partial.inventoryComplete, false);
  assert.equal(
    brewPlanningSummary(snapshot, ["malt", "hop"]).inventoryComplete,
    true,
  );
  assert.equal(brewPlanningSummary().inventoryComplete, false);
});
