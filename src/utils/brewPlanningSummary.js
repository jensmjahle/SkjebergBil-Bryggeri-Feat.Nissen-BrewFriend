import { stepPhase } from "./brewPhase.js";

export function brewPlanningSummary(snapshot = {}, availableIds = []) {
  const ingredients = (snapshot.ingredients || []).filter((ingredient) =>
    ingredient.name?.trim(),
  );
  const available = new Set(availableIds);
  const availableCount = ingredients.filter((ingredient) =>
    available.has(ingredient.ingredientId),
  ).length;
  const totalMinutes = (phase) =>
    (snapshot.steps || []).reduce((sum, step) => {
      const minutes = Number(step.durationMinutes);
      return stepPhase(step) === phase &&
        Number.isFinite(minutes) &&
        minutes > 0
        ? sum + minutes
        : sum;
    }, 0);
  return {
    mashMinutes: totalMinutes("mash"),
    boilMinutes: totalMinutes("boil"),
    ingredientCount: ingredients.length,
    availableCount,
    missingCount: ingredients.length - availableCount,
    inventoryComplete:
      ingredients.length > 0 && availableCount === ingredients.length,
    inventoryPercent: ingredients.length
      ? Math.round((availableCount / ingredients.length) * 100)
      : 0,
  };
}

// Empty ranges are optional; a supplied range must be complete and ordered.
export function gravityRangeError(from, to) {
  if (!from && !to) return null;
  if (!from || !to) return 'incomplete';
  if (![from, to].every(value => /^1\.\d{3}$/.test(String(value)))) return 'format';
  return Number(from) > Number(to) ? 'order' : null;
}
