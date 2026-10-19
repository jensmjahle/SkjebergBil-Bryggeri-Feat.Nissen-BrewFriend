import { brewPlanningSummary } from "./brewPlanningSummary.js";

export function recipeDetailSummary(recipe = {}) {
  const defaults = recipe.defaults || {};
  const gravity = ["ogFrom", "ogTo", "fgFrom", "fgTo"].map((key) => {
    const value = defaults[key];
    return typeof value === "string" && /^1\.\d{3}$/.test(value)
      ? Number(value)
      : null;
  });
  const abv =
    gravity.every((value) => value !== null) &&
    gravity[0] <= gravity[1] &&
    gravity[2] <= gravity[3]
      ? {
          min: Math.max(0, (gravity[0] - gravity[3]) * 131.25),
          max: Math.max(0, (gravity[1] - gravity[2]) * 131.25),
        }
      : null;
  const ingredients = (recipe.ingredients || []).filter((item) =>
    item.name?.trim(),
  );
  const priced = ingredients.filter(
    (item) =>
      item.price != null &&
      item.price !== "" &&
      Number.isFinite(Number(item.price)) &&
      Number(item.price) >= 0,
  );
  const totalCost = priced.length
    ? priced.reduce((sum, item) => sum + Number(item.price), 0)
    : null;
  const volume =
    defaults.batchSizeLiters != null &&
    Number(defaults.batchSizeLiters) > 0 &&
    Number.isFinite(Number(defaults.batchSizeLiters))
      ? Number(defaults.batchSizeLiters)
      : null;
  return {
    ...brewPlanningSummary(recipe),
    volume,
    abv,
    totalCost,
    pricedCount: priced.length,
    costComplete:
      ingredients.length > 0 && priced.length === ingredients.length,
    literPrice: totalCost !== null && volume ? totalCost / volume : null,
  };
}
