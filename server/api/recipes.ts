import { Router } from "express";
import { requireBrewer } from "../mongo/auth.js";
import { Recipe } from "../mongo/models/Recipe.js";

export const recipesRouter = Router();

recipesRouter.use(requireBrewer);

function toNumberOrUndefined(value: any) {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeRecipePayload(payload: any = {}) {
  const steps = Array.isArray(payload.steps)
    ? payload.steps
        .map((step: any, index: number) => ({
          order: Number(step?.order) > 0 ? Number(step.order) : index + 1,
          stepType: step?.stepType ? String(step.stepType).trim() : "custom",
          title: String(step?.title || "").trim(),
          description: step?.description ? String(step.description).trim() : undefined,
          durationMinutes: toNumberOrUndefined(step?.durationMinutes),
          temperatureC: toNumberOrUndefined(step?.temperatureC),
          co2Volumes: toNumberOrUndefined(step?.co2Volumes),
          data:
            step?.data && typeof step.data === "object" && !Array.isArray(step.data)
              ? step.data
              : {},
        }))
        .filter((step: any) => step.title.length > 0)
    : [];

  return {
    name: String(payload.name || "").trim(),
    beerType: payload.beerType ? String(payload.beerType).trim() : undefined,
    flavorProfile: payload.flavorProfile
      ? String(payload.flavorProfile).trim()
      : undefined,
    color: payload.color ? String(payload.color).trim() : undefined,
    imageUrl: payload.imageUrl ? String(payload.imageUrl).trim() : undefined,
    defaults: {
      og: toNumberOrUndefined(payload?.defaults?.og),
      fg: toNumberOrUndefined(payload?.defaults?.fg),
      sg: toNumberOrUndefined(payload?.defaults?.sg),
      co2Volumes: toNumberOrUndefined(payload?.defaults?.co2Volumes),
      ibu: toNumberOrUndefined(payload?.defaults?.ibu),
    },
    steps,
  };
}

recipesRouter.post("/", async (req: any, res) => {
  try {
    const brewerId = req.brewer.sub;
    const payload = normalizeRecipePayload(req.body || {});

    if (!payload.name || payload.name.length < 2) {
      return res.status(400).json({ error: "Recipe name is required" });
    }

    const recipe = await Recipe.create({
      brewerId,
      name: payload.name,
      beerType: payload.beerType,
      flavorProfile: payload.flavorProfile,
      color: payload.color,
      imageUrl: payload.imageUrl,
      defaults: payload.defaults,
      steps: payload.steps,
    });

    return res.status(201).json(recipe);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to create recipe" });
  }
});

recipesRouter.get("/", async (req: any, res) => {
  try {
    const recipes = await Recipe.find({ brewerId: req.brewer.sub }).sort({ updatedAt: -1 });
    return res.json(recipes);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to list recipes" });
  }
});

recipesRouter.get("/:id", async (req: any, res) => {
  try {
    const recipe = await Recipe.findOne({ _id: req.params.id, brewerId: req.brewer.sub });
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    return res.json(recipe);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to get recipe" });
  }
});

recipesRouter.patch("/:id", async (req: any, res) => {
  try {
    const payload = normalizeRecipePayload(req.body || {});
    const updates = {
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.beerType !== undefined ? { beerType: payload.beerType } : {}),
      ...(payload.flavorProfile !== undefined
        ? { flavorProfile: payload.flavorProfile }
        : {}),
      ...(payload.color !== undefined ? { color: payload.color } : {}),
      ...(payload.imageUrl !== undefined ? { imageUrl: payload.imageUrl } : {}),
      ...(payload.defaults ? { defaults: payload.defaults } : {}),
      ...(payload.steps ? { steps: payload.steps } : {}),
    };

    const recipe = await Recipe.findOneAndUpdate(
      { _id: req.params.id, brewerId: req.brewer.sub },
      updates,
      { new: true, runValidators: true },
    );

    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    return res.json(recipe);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to update recipe" });
  }
});

recipesRouter.delete("/:id", async (req: any, res) => {
  try {
    const recipe = await Recipe.findOneAndDelete({ _id: req.params.id, brewerId: req.brewer.sub });
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to delete recipe" });
  }
});
