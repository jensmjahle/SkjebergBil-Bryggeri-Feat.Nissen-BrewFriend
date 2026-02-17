import { Router } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { Recipe } from "../mongo/models/Recipe.js";
import { Brewer } from "../mongo/models/Brewer.js";

export const recipesRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const GRAVITY_PATTERN = /^1\.\d{3}$/;
const INGREDIENT_CATEGORIES = new Set(["fermentable", "hops", "yeast", "other"]);
const ICON_PATH_PREFIX = "/icons/beer-types/";

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

function toBoolean(value: any) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function toIntegerOrUndefined(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}

function normalizeIconPath(value: any) {
  const text = value === null || value === undefined ? "" : String(value).trim();
  if (!text) return undefined;
  return text.startsWith(ICON_PATH_PREFIX) ? text : undefined;
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
  const recipeGroupId = data.recipeGroupId ? String(data.recipeGroupId) : String(data._id || "");
  const version = toIntegerOrUndefined(data.version) || 1;
  return {
    ...data,
    recipeGroupId,
    version,
    isLatest: data.isLatest !== false,
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
          const normalizedCategory = INGREDIENT_CATEGORIES.has(category)
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
    iconPath: normalizeIconPath(payload.iconPath),
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

function mergeRecipeSource(sourceRaw: any, incomingRaw: any) {
  const source = sourceRaw && typeof sourceRaw === "object" ? sourceRaw : {};
  const incoming = incomingRaw && typeof incomingRaw === "object" ? incomingRaw : {};

  const sourceDefaults =
    source.defaults && typeof source.defaults === "object" ? source.defaults : {};
  const incomingDefaults =
    incoming.defaults && typeof incoming.defaults === "object" ? incoming.defaults : {};

  return {
    name: incoming.name ?? source.name,
    beerType: incoming.beerType ?? source.beerType,
    iconPath: incoming.iconPath ?? source.iconPath,
    flavorProfile: incoming.flavorProfile ?? source.flavorProfile,
    color: incoming.color ?? source.color,
    imageUrl: incoming.imageUrl ?? source.imageUrl,
    defaults: {
      ogFrom: incomingDefaults.ogFrom ?? sourceDefaults.ogFrom,
      ogTo: incomingDefaults.ogTo ?? sourceDefaults.ogTo,
      fgFrom: incomingDefaults.fgFrom ?? sourceDefaults.fgFrom,
      fgTo: incomingDefaults.fgTo ?? sourceDefaults.fgTo,
      co2Volumes: incomingDefaults.co2Volumes ?? sourceDefaults.co2Volumes,
      ibu: incomingDefaults.ibu ?? sourceDefaults.ibu,
      batchSizeLiters: incomingDefaults.batchSizeLiters ?? sourceDefaults.batchSizeLiters,
    },
    steps: Object.prototype.hasOwnProperty.call(incoming, "steps")
      ? incoming.steps
      : source.steps,
    ingredients: Object.prototype.hasOwnProperty.call(incoming, "ingredients")
      ? incoming.ingredients
      : source.ingredients,
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

async function listVersionsForRecipe(brewerId: string, recipe: any) {
  const recipeId = String(recipe?._id || "");
  const recipeGroupId = recipe?.recipeGroupId
    ? String(recipe.recipeGroupId)
    : recipeId;

  if (!recipeGroupId) return [];

  const versions = await Recipe.find({ brewerId, recipeGroupId }).sort({
    version: -1,
    updatedAt: -1,
  });

  if (versions.length > 0) return versions;
  return recipe ? [recipe] : [];
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

    const recipeGroupId = randomUUID();
    const recipe = await Recipe.create({
      brewerId,
      recipeGroupId,
      version: 1,
      isLatest: true,
      name: payload.name,
      beerType: payload.beerType,
      iconPath: payload.iconPath,
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
    const includeOlderVersions = toBoolean(req.query?.includeOlderVersions) || false;

    const clauses: any[] = [{ brewerId }];

    if (!includeOlderVersions) {
      clauses.push({
        $or: [{ isLatest: true }, { isLatest: { $exists: false } }],
      });
    }

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

recipesRouter.get("/:id/versions", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const recipe = await Recipe.findOne({ _id: req.params.id, brewerId });
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const versions = await listVersionsForRecipe(brewerId, recipe);
    return res.json(versions.map((doc: any) => attachComputedFields(doc)));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to list recipe versions" });
  }
});

recipesRouter.post("/:id/versions", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const baseRecipe = await Recipe.findOne({ _id: req.params.id, brewerId });
    if (!baseRecipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const baseData = typeof baseRecipe.toObject === "function"
      ? baseRecipe.toObject()
      : baseRecipe;
    const recipeGroupId = baseData.recipeGroupId
      ? String(baseData.recipeGroupId)
      : String(baseData._id);
    const baseVersion = toIntegerOrUndefined(baseData.version) || 1;
    const latestFlag = baseData.isLatest !== false;

    if (!baseData.recipeGroupId || !baseData.version || baseData.isLatest === undefined) {
      baseRecipe.recipeGroupId = recipeGroupId;
      baseRecipe.version = baseVersion;
      baseRecipe.isLatest = latestFlag;
      await baseRecipe.save();
    }

    const payload = normalizeRecipePayload(
      mergeRecipeSource(baseData, req.body || {}),
    );

    if (!payload.name || payload.name.length < 2) {
      return res.status(400).json({ error: "Recipe name is required" });
    }

    const gravityError = validateGravityRange(payload.defaults);
    if (gravityError) {
      return res.status(400).json({ error: gravityError });
    }

    const newestVersionDoc = await Recipe.findOne({ brewerId, recipeGroupId }).sort({
      version: -1,
      updatedAt: -1,
    });
    const nextVersion = (toIntegerOrUndefined(newestVersionDoc?.version) || baseVersion) + 1;

    await Recipe.updateMany({ brewerId, recipeGroupId }, { $set: { isLatest: false } });

    const recipe = await Recipe.create({
      brewerId,
      recipeGroupId,
      version: nextVersion,
      isLatest: true,
      name: payload.name,
      beerType: payload.beerType,
      iconPath: payload.iconPath,
      flavorProfile: payload.flavorProfile,
      color: payload.color,
      imageUrl: payload.imageUrl,
      defaults: payload.defaults,
      steps: payload.steps,
      ingredients: payload.ingredients,
    });

    return res.status(201).json(attachComputedFields(recipe));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to create recipe version" });
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
      ...(payload.iconPath !== undefined ? { iconPath: payload.iconPath } : {}),
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

    const recipeData =
      typeof recipe.toObject === "function" ? recipe.toObject() : recipe;
    const wasLatest = recipeData?.isLatest !== false;
    const recipeGroupId = recipeData?.recipeGroupId
      ? String(recipeData.recipeGroupId)
      : String(recipeData?._id || "");

    if (wasLatest && recipeGroupId) {
      const replacement = await Recipe.findOne({ brewerId, recipeGroupId }).sort({
        version: -1,
        updatedAt: -1,
      });
      if (replacement) {
        replacement.isLatest = true;
        if (!replacement.recipeGroupId) replacement.recipeGroupId = recipeGroupId;
        if (!replacement.version) replacement.version = 1;
        await replacement.save();
      }
    }

    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to delete recipe" });
  }
});

recipesRouter.delete("/:id/group", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const recipe = await Recipe.findOne({ _id: req.params.id, brewerId });
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const recipeData =
      typeof recipe.toObject === "function" ? recipe.toObject() : recipe;
    const recipeGroupId = recipeData?.recipeGroupId
      ? String(recipeData.recipeGroupId)
      : "";

    if (recipeGroupId) {
      await Recipe.deleteMany({ brewerId, recipeGroupId });
    } else {
      await Recipe.deleteOne({ _id: recipe._id, brewerId });
    }

    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to delete recipe group" });
  }
});
