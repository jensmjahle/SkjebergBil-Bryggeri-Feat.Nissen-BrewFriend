import test from "node:test";
import assert from "node:assert/strict";
import { recipeDetailSummary } from "./recipeDetailSummary.js";
test("recipe summary groups times and distinguishes partial costs from a complete budget", () => {
  const summary = recipeDetailSummary({
    defaults: {
      batchSizeLiters: 55,
      ogFrom: "1.056",
      ogTo: "1.070",
      fgFrom: "1.010",
      fgTo: "1.014",
    },
    steps: [
      { stepType: "mash", durationMinutes: 60 },
      { stepType: "boil", durationMinutes: 60 },
    ],
    ingredients: [
      { name: "Malt", price: 1 },
      { name: "Hops", price: null },
      { name: "Yeast" },
    ],
  });
  assert.equal(summary.totalCost, 1);
  assert.equal(summary.pricedCount, 1);
  assert.equal(summary.costComplete, false);
  assert.equal(summary.mashMinutes, 60);
  assert.equal(summary.boilMinutes, 60);
  assert.ok(Math.abs(summary.abv.min - 5.5125) < 0.00001);
  assert.ok(Math.abs(summary.abv.max - 7.875) < 0.00001);
  assert.equal(summary.literPrice, 1 / 55);
});
test("unknown values stay unknown while explicitly free ingredients remain zero cost", () => {
  const missing = recipeDetailSummary({
    defaults: {
      batchSizeLiters: null,
      ogFrom: null,
      ogTo: null,
      fgFrom: null,
      fgTo: null,
    },
    ingredients: [{ name: "Malt", price: null }],
  });
  assert.equal(missing.abv, null);
  assert.equal(missing.totalCost, null);
  assert.equal(missing.literPrice, null);
  const free = recipeDetailSummary({
    ingredients: [{ name: "Malt", price: 0 }],
  });
  assert.equal(free.totalCost, 0);
  assert.equal(free.costComplete, true);
  assert.equal(
    recipeDetailSummary({
      defaults: {
        ogFrom: "1.070",
        ogTo: "1.050",
        fgFrom: "1.010",
        fgTo: "1.014",
      },
    }).abv,
    null,
  );
});
