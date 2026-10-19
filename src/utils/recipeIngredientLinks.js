// Preserve the brewing instruction when its source ingredient is deleted.
export function detachBoilIngredient(steps, ingredient) {
  if (!ingredient?.ingredientId) return;
  for (const step of steps || []) {
    if (!Array.isArray(step.data?.additions)) continue;
    step.data.additions = step.data.additions.map((addition) => {
      if (addition.ingredientId !== ingredient.ingredientId) return addition;
      const { ingredientId, ...standalone } = addition;
      return {
        ...standalone,
        name: ingredient.name || addition.name || "",
        amount: addition.amount == null || addition.amount === "" ? ingredient.amount || "" : addition.amount,
        unit: addition.unit == null || addition.unit === "" ? ingredient.unit || "" : addition.unit,
      };
    });
  }
}
