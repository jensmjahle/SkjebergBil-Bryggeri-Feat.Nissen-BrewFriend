import { Router } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { Recipe } from "../mongo/models/Recipe.js";
import { Brewer } from "../mongo/models/Brewer.js";

export const recipesRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const GRAVITY_PATTERN = /^1\.\d{3}$/;

function toNumberOrUndefined(value: any) {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toGravityOrUndefined(value: any) {
  if (value === null || value === undefined || value === "") return undefined;
  const text = String(value).trim();
  return GRAVITY_PATTERN.test(text) ? text : undefined;
}

function gravityToNum(value?: string) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function computeCostSummary(defaults: any = {}, ingredients: any[] = []) {
  const totalIngredientCost = (Array.isArray(ingredients) ? ingredients : []).reduce(
    (sum, ingredient) => {
      const price = toNumberOrUndefined(ingredient?.price);
      if (price === undefined || price < 0) return sum;
      return sum + price;
    },
    0,
  );

  const batchSizeLiters = toNumberOrUndefined(defaults?.batchSizeLiters);
  const literPrice =
    batchSizeLiters !== undefined && batchSizeLiters > 0
      ? totalIngredientCost / batchSizeLiters
      : undefined;

  return {
    totalIngredientCost: Number(totalIngredientCost.toFixed(2)),
    batchSizeLiters,
    literPrice:
      literPrice !== undefined ? Number(Math.max(0, literPrice).toFixed(2)) : undefined,
  };
}

function computeAbvRange(defaults: any = {}) {
  const ogFrom = gravityToNum(defaults.ogFrom);
  const ogTo = gravityToNum(defaults.ogTo);
  const fgFrom = gravityToNum(defaults.fgFrom);
  const fgTo = gravityToNum(defaults.fgTo);

  if (
    ogFrom === undefined ||
    ogTo === undefined ||
    fgFrom === undefined ||
    fgTo === undefined
  ) {
    return null;
  }

  const min = (ogFrom - fgTo) * 131.25;
  const max = (ogTo - fgFrom) * 131.25;
  return {
    min: Number(Math.max(0, min).toFixed(2)),
    max: Number(Math.max(0, max).toFixed(2)),
  };
}

function attachComputedFields(recipe: any) {
  if (!recipe) return recipe;
  const data = typeof recipe.toObject === "function" ? recipe.toObject() : recipe;
  return {
    ...data,
    abvRange: computeAbvRange(data.defaults),
    costSummary: computeCostSummary(data.defaults, data.ingredients),
  };
}

function normalizeRecipePayload(payload: any = {}) {
  const steps = Array.isArray(payload.steps)
    ? payload.steps
        .map((step: any, index: number) => ({
          stepId: step?.stepId ? String(step.stepId).trim() : `step-${randomUUID()}`,
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

  const allowedStepIds = new Set(steps.map((step: any) => step.stepId));

  const ingredients = Array.isArray(payload.ingredients)
    ? payload.ingredients
        .map((ing: any) => {
          const category = ing?.category ? String(ing.category).trim() : "other";
          const normalizedCategory =
            category === "fermentable" || category === "hops" || category === "other"
              ? category
              : "other";

          const rawStepIds = Array.isArray(ing?.stepIds)
            ? ing.stepIds.map((id: any) => String(id).trim())
            : [];

          return {
            ingredientId: ing?.ingredientId
              ? String(ing.ingredientId).trim()
              : `ingredient-${randomUUID()}`,
            name: String(ing?.name || "").trim(),
            category: normalizedCategory,
            amount: ing?.amount ? String(ing.amount).trim() : undefined,
            unit: ing?.unit ? String(ing.unit).trim() : undefined,
            price: toNumberOrUndefined(ing?.price),
            notes: ing?.notes ? String(ing.notes).trim() : undefined,
            stepIds: rawStepIds.filter((stepId: string) => allowedStepIds.has(stepId)),
          };
        })
        .filter((ing: any) => ing.name.length > 0)
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
      ogFrom: toGravityOrUndefined(payload?.defaults?.ogFrom),
      ogTo: toGravityOrUndefined(payload?.defaults?.ogTo),
      fgFrom: toGravityOrUndefined(payload?.defaults?.fgFrom),
      fgTo: toGravityOrUndefined(payload?.defaults?.fgTo),
      co2Volumes: toNumberOrUndefined(payload?.defaults?.co2Volumes),
      ibu: toNumberOrUndefined(payload?.defaults?.ibu),
      batchSizeLiters: toNumberOrUndefined(payload?.defaults?.batchSizeLiters),
    },
    steps,
    ingredients,
  };
}

function validateGravityRange(defaults: any) {
  const gravityFields = ["ogFrom", "ogTo", "fgFrom", "fgTo"];
  for (const field of gravityFields) {
    const value = defaults?.[field];
    if (value !== undefined && !GRAVITY_PATTERN.test(value)) {
      return `${field} must be in format 1.056`;
    }
  }

  const ogFrom = gravityToNum(defaults?.ogFrom);
  const ogTo = gravityToNum(defaults?.ogTo);
  const fgFrom = gravityToNum(defaults?.fgFrom);
  const fgTo = gravityToNum(defaults?.fgTo);

  if (ogFrom !== undefined && ogTo !== undefined && ogFrom > ogTo) {
    return "OG range is invalid (from is greater than to)";
  }

  if (fgFrom !== undefined && fgTo !== undefined && fgFrom > fgTo) {
    return "FG range is invalid (from is greater than to)";
  }

  return null;
}

function extractBearerToken(req: any) {
  const header = req.headers?.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function normalizeUsername(input: string) {
  return String(input || "demo-brewer").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findOrCreateBrewerByUsername(rawUsername: string, displayName?: string) {
  const username = normalizeUsername(rawUsername || "demo-brewer");
  let brewer = await Brewer.findOne({ username });

  if (!brewer) {
    brewer = await Brewer.create({
      username,
      name: displayName || username,
      phoneNumber: "",
      passwordHash: "external-auth",
      profileImageUrl: "",
    });
  }

  return brewer;
}

async function resolveBrewerId(req: any) {
  const token = extractBearerToken(req);

  if (token) {
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);

      if (decoded?.role === "BREWER" && decoded?.sub) {
        const existing = await Brewer.findById(decoded.sub);
        if (existing) return String(existing._id);
      }

      if (decoded?.sub) {
        const brewer = await findOrCreateBrewerByUsername(
          decoded.username || decoded.sub,
          decoded.username || decoded.sub,
        );
        return String(brewer._id);
      }
    } catch (_err) {
      // fall through
    }
  }

  const demoBrewer = await findOrCreateBrewerByUsername("demo-brewer", "Demo Brewer");
  return String(demoBrewer._id);
}

recipesRouter.post("/", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const payload = normalizeRecipePayload(req.body || {});

    if (!payload.name || payload.name.length < 2) {
      return res.status(400).json({ error: "Recipe name is required" });
    }

    const gravityError = validateGravityRange(payload.defaults);
    if (gravityError) {
      return res.status(400).json({ error: gravityError });
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
      ingredients: payload.ingredients,
    });

    return res.status(201).json(attachComputedFields(recipe));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to create recipe" });
  }
});

recipesRouter.get("/", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const q = req.query?.q ? String(req.query.q).trim() : "";
    const beerType = req.query?.beerType ? String(req.query.beerType).trim() : "";
    const stepType = req.query?.stepType ? String(req.query.stepType).trim() : "";
    const ingredientCategory = req.query?.ingredientCategory
      ? String(req.query.ingredientCategory).trim()
      : "";
    const hasDefaults = req.query?.hasDefaults ? String(req.query.hasDefaults) : "";
    const sort = req.query?.sort ? String(req.query.sort) : "newest";

    const clauses: any[] = [{ brewerId }];

    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      clauses.push({
        $or: [
          { name: rx },
          { beerType: rx },
          { flavorProfile: rx },
          { "steps.title": rx },
          { "steps.description": rx },
          { "ingredients.name": rx },
          { "ingredients.notes": rx },
        ],
      });
    }

    if (beerType) {
      clauses.push({ beerType: new RegExp(`^${escapeRegex(beerType)}$`, "i") });
    }

    if (stepType) {
      clauses.push({ "steps.stepType": stepType });
    }

    if (ingredientCategory) {
      clauses.push({ "ingredients.category": ingredientCategory });
    }

    if (hasDefaults === "true") {
      clauses.push({
        $or: [
          { "defaults.ogFrom": { $ne: null } },
          { "defaults.ogTo": { $ne: null } },
          { "defaults.fgFrom": { $ne: null } },
          { "defaults.fgTo": { $ne: null } },
          { "defaults.co2Volumes": { $ne: null } },
          { "defaults.ibu": { $ne: null } },
          { "defaults.batchSizeLiters": { $ne: null } },
        ],
      });
    } else if (hasDefaults === "false") {
      clauses.push({
        $and: [
          { "defaults.ogFrom": null },
          { "defaults.ogTo": null },
          { "defaults.fgFrom": null },
          { "defaults.fgTo": null },
          { "defaults.co2Volumes": null },
          { "defaults.ibu": null },
          { "defaults.batchSizeLiters": null },
        ],
      });
    }

    const mongoFilter = clauses.length === 1 ? clauses[0] : { $and: clauses };

    const sortMap: Record<string, any> = {
      newest: { updatedAt: -1 },
      oldest: { updatedAt: 1 },
      name_asc: { name: 1 },
      name_desc: { name: -1 },
    };

    if (sort === "steps_desc") {
      const recipes = await Recipe.aggregate([
        { $match: mongoFilter },
        { $addFields: { stepCount: { $size: { $ifNull: ["$steps", []] } } } },
        { $sort: { stepCount: -1, updatedAt: -1 } },
      ]);
      return res.json(recipes.map((r: any) => attachComputedFields(r)));
    }

    const recipes = await Recipe.find(mongoFilter).sort(sortMap[sort] || sortMap.newest);
    return res.json(recipes.map((recipe: any) => attachComputedFields(recipe)));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to list recipes" });
  }
});

recipesRouter.get("/:id", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const recipe = await Recipe.findOne({ _id: req.params.id, brewerId });
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    return res.json(attachComputedFields(recipe));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to get recipe" });
  }
});

recipesRouter.patch("/:id", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const payload = normalizeRecipePayload(req.body || {});
    const gravityError = validateGravityRange(payload.defaults);
    if (gravityError) {
      return res.status(400).json({ error: gravityError });
    }

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
      ...(payload.ingredients ? { ingredients: payload.ingredients } : {}),
    };

    const recipe = await Recipe.findOneAndUpdate(
      { _id: req.params.id, brewerId },
      updates,
      { new: true, runValidators: true },
    );

    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    return res.json(attachComputedFields(recipe));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to update recipe" });
  }
});

recipesRouter.delete("/:id", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const recipe = await Recipe.findOneAndDelete({ _id: req.params.id, brewerId });
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to delete recipe" });
  }
});
