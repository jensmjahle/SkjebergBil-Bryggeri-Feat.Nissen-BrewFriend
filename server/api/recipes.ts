import { Router } from "express";
import jwt from "jsonwebtoken";
import { Recipe } from "../mongo/models/Recipe.js";
import { Brewer } from "../mongo/models/Brewer.js";

export const recipesRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

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
      // fall through to demo brewer
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
    const brewerId = await resolveBrewerId(req);
    const q = req.query?.q ? String(req.query.q).trim() : "";
    const beerType = req.query?.beerType ? String(req.query.beerType).trim() : "";
    const stepType = req.query?.stepType ? String(req.query.stepType).trim() : "";
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
        ],
      });
    }

    if (beerType) {
      clauses.push({ beerType: new RegExp(`^${escapeRegex(beerType)}$`, "i") });
    }

    if (stepType) {
      clauses.push({ "steps.stepType": stepType });
    }

    if (hasDefaults === "true") {
      clauses.push({
        $or: [
          { "defaults.og": { $ne: null } },
          { "defaults.fg": { $ne: null } },
          { "defaults.sg": { $ne: null } },
          { "defaults.co2Volumes": { $ne: null } },
          { "defaults.ibu": { $ne: null } },
        ],
      });
    } else if (hasDefaults === "false") {
      clauses.push({
        $and: [
          { "defaults.og": null },
          { "defaults.fg": null },
          { "defaults.sg": null },
          { "defaults.co2Volumes": null },
          { "defaults.ibu": null },
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
      return res.json(recipes);
    }

    const recipes = await Recipe.find(mongoFilter).sort(sortMap[sort] || sortMap.newest);
    return res.json(recipes);
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
    return res.json(recipe);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to get recipe" });
  }
});

recipesRouter.patch("/:id", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
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
      { _id: req.params.id, brewerId },
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
