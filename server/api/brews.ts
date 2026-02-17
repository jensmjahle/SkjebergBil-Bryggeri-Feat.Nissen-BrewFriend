import { Router } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { Brew } from "../mongo/models/Brew.js";
import { Recipe } from "../mongo/models/Recipe.js";
import { Brewer } from "../mongo/models/Brewer.js";
import { broadcastBrewDeleted, broadcastBrewUpdate } from "../live/brewLive.js";

export const brewsRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const GRAVITY_PATTERN = /^1\.\d{3}$/;
const ALLOWED_STATUSES = new Set([
  "planned",
  "active",
  "conditioning",
  "completed",
  "archived",
]);

type AnyObj = Record<string, any>;

function toPlainObject(value: any): AnyObj {
  if (!value) return {};
  if (typeof value.toObject === "function") return value.toObject();
  return value;
}

function toStringOrUndefined(value: any) {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
}

function toNumberOrUndefined(value: any) {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toGravityOrUndefined(value: any) {
  const text = toStringOrUndefined(value);
  if (!text) return undefined;
  return GRAVITY_PATTERN.test(text) ? text : undefined;
}

function gravityToNumber(value?: string) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toDateOrUndefined(value: any) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function secondsRemainingFromEntry(entry: any, nowMs: number) {
  if (!entry) return undefined;
  const paused = toNumberOrUndefined(entry.pausedRemainingSeconds);
  if (paused !== undefined && paused >= 0) return paused;

  const endsAt = toDateOrUndefined(entry.timerEndsAt);
  if (!endsAt) return undefined;

  const remaining = Math.ceil((endsAt.getTime() - nowMs) / 1000);
  return Math.max(0, remaining);
}

function accumulateElapsedOnEntry(entry: any, now: Date) {
  if (!entry?.activeSinceAt) return;
  const activeSince = toDateOrUndefined(entry.activeSinceAt);
  if (!activeSince) {
    entry.activeSinceAt = undefined;
    return;
  }

  const elapsed = Math.max(
    0,
    Math.floor((now.getTime() - activeSince.getTime()) / 1000),
  );
  const previousAccumulated = toNumberOrUndefined(entry.accumulatedActiveSeconds) || 0;
  entry.accumulatedActiveSeconds = previousAccumulated + elapsed;
  entry.activeSinceAt = undefined;
}

function elapsedSecondsForEntry(entry: any, now: Date) {
  const base = toNumberOrUndefined(entry?.accumulatedActiveSeconds) || 0;
  if (!entry?.activeSinceAt || entry?.status !== "active") return base;
  const activeSince = toDateOrUndefined(entry.activeSinceAt);
  if (!activeSince) return base;
  const delta = Math.max(0, Math.floor((now.getTime() - activeSince.getTime()) / 1000));
  return base + delta;
}

function clampIndex(index: any, stepsLength: number) {
  if (!Number.isFinite(Number(index))) return 0;
  const n = Math.max(0, Math.floor(Number(index)));
  if (stepsLength <= 0) return 0;
  return Math.min(n, stepsLength - 1);
}

function normalizeStatus(input: any) {
  const status = toStringOrUndefined(input);
  if (!status) return undefined;
  return ALLOWED_STATUSES.has(status) ? status : undefined;
}

function normalizeStep(step: any, index: number) {
  return {
    stepId: step?.stepId ? String(step.stepId).trim() : `step-${randomUUID()}`,
    order: Number(step?.order) > 0 ? Number(step.order) : index + 1,
    stepType: step?.stepType ? String(step.stepType).trim() : "custom",
    title: String(step?.title || "").trim(),
    description: toStringOrUndefined(step?.description),
    durationMinutes: toNumberOrUndefined(step?.durationMinutes),
    temperatureC: toNumberOrUndefined(step?.temperatureC),
    co2Volumes: toNumberOrUndefined(step?.co2Volumes),
    data:
      step?.data && typeof step.data === "object" && !Array.isArray(step.data)
        ? step.data
        : {},
  };
}

function normalizeIngredientCategory(value: any) {
  const text = toStringOrUndefined(value) || "other";
  if (text === "fermentable" || text === "hops" || text === "other") return text;
  return "other";
}

function normalizeRecipeSnapshot(payload: any = {}, sourceRecipeOrSnapshot: any = {}) {
  const incoming = payload && typeof payload === "object" ? payload : {};
  const source = toPlainObject(sourceRecipeOrSnapshot || {});

  const incomingDefaults =
    incoming.defaults && typeof incoming.defaults === "object" ? incoming.defaults : {};
  const sourceDefaults =
    source.defaults && typeof source.defaults === "object" ? source.defaults : {};

  const hasIncomingSteps = Object.prototype.hasOwnProperty.call(incoming, "steps");
  const rawSteps = hasIncomingSteps
    ? Array.isArray(incoming.steps)
      ? incoming.steps
      : []
    : Array.isArray(source.steps)
      ? source.steps
      : [];

  const steps = rawSteps
    .map((step: any, index: number) => normalizeStep(step, index))
    .filter((step: any) => step.title.length > 0);

  const allowedStepIds = new Set(steps.map((step: any) => step.stepId));

  const hasIncomingIngredients = Object.prototype.hasOwnProperty.call(
    incoming,
    "ingredients",
  );
  const rawIngredients = hasIncomingIngredients
    ? Array.isArray(incoming.ingredients)
      ? incoming.ingredients
      : []
    : Array.isArray(source.ingredients)
      ? source.ingredients
      : [];

  const ingredients = rawIngredients
    .map((ing: any) => {
      const rawStepIds = Array.isArray(ing?.stepIds)
        ? ing.stepIds.map((id: any) => String(id).trim())
        : [];

      return {
        ingredientId: ing?.ingredientId
          ? String(ing.ingredientId).trim()
          : `ingredient-${randomUUID()}`,
        name: String(ing?.name || "").trim(),
        category: normalizeIngredientCategory(ing?.category),
        amount: toStringOrUndefined(ing?.amount),
        unit: toStringOrUndefined(ing?.unit),
        notes: toStringOrUndefined(ing?.notes),
        stepIds: rawStepIds.filter((stepId: string) => allowedStepIds.has(stepId)),
      };
    })
    .filter((ing: any) => ing.name.length > 0);

  return {
    recipeId:
      incoming.recipeId !== undefined
        ? incoming.recipeId
        : source._id || source.recipeId || undefined,
    name: toStringOrUndefined(incoming.name ?? source.name),
    beerType: toStringOrUndefined(incoming.beerType ?? source.beerType),
    flavorProfile: toStringOrUndefined(incoming.flavorProfile ?? source.flavorProfile),
    color: toStringOrUndefined(incoming.color ?? source.color),
    imageUrl: toStringOrUndefined(incoming.imageUrl ?? source.imageUrl),
    defaults: {
      ogFrom: toGravityOrUndefined(incomingDefaults.ogFrom ?? sourceDefaults.ogFrom),
      ogTo: toGravityOrUndefined(incomingDefaults.ogTo ?? sourceDefaults.ogTo),
      fgFrom: toGravityOrUndefined(incomingDefaults.fgFrom ?? sourceDefaults.fgFrom),
      fgTo: toGravityOrUndefined(incomingDefaults.fgTo ?? sourceDefaults.fgTo),
      co2Volumes: toNumberOrUndefined(incomingDefaults.co2Volumes ?? sourceDefaults.co2Volumes),
      ibu: toNumberOrUndefined(incomingDefaults.ibu ?? sourceDefaults.ibu),
    },
    steps,
    ingredients,
  };
}

function buildStepProgress(steps: any[] = [], existing: any[] = []) {
  const existingByStepId = new Map(
    (Array.isArray(existing) ? existing : [])
      .filter((entry: any) => entry?.stepId)
      .map((entry: any) => [String(entry.stepId), entry]),
  );

  return steps.map((step: any) => {
    const previous = existingByStepId.get(step.stepId);
    if (!previous) {
      return {
        stepId: step.stepId,
        status: "pending",
        startedAt: undefined,
        activeSinceAt: undefined,
        completedAt: undefined,
        timerDurationSeconds: undefined,
        timerEndsAt: undefined,
        pausedRemainingSeconds: undefined,
        accumulatedActiveSeconds: 0,
        actualDurationSeconds: undefined,
      };
    }

    const normalizedStatus =
      previous.status === "active" || previous.status === "completed"
        ? previous.status
        : "pending";

    return {
      stepId: step.stepId,
      status: normalizedStatus,
      startedAt: previous.startedAt,
      activeSinceAt: toDateOrUndefined(previous.activeSinceAt),
      completedAt: previous.completedAt,
      timerDurationSeconds: toNumberOrUndefined(previous.timerDurationSeconds),
      timerEndsAt: toDateOrUndefined(previous.timerEndsAt),
      pausedRemainingSeconds: toNumberOrUndefined(previous.pausedRemainingSeconds),
      accumulatedActiveSeconds: toNumberOrUndefined(previous.accumulatedActiveSeconds) || 0,
      actualDurationSeconds: toNumberOrUndefined(previous.actualDurationSeconds),
    };
  });
}

function applyTimelineUpdate(target: AnyObj, incoming: AnyObj) {
  const fields = [
    "plannedStartAt",
    "brewDayAt",
    "fermentationStartAt",
    "fermentationEndAt",
    "bottledAt",
    "keggedAt",
    "completedAt",
  ];

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(incoming, field)) {
      target[field] = toDateOrUndefined(incoming[field]);
    }
  });
}

function applyTargetMetricsUpdate(target: AnyObj, incoming: AnyObj) {
  const fields = ["gravity", "og", "fg", "sg", "co2Volumes", "ibu", "ph"];
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(incoming, field)) {
      target[field] = toNumberOrUndefined(incoming[field]);
    }
  });
}

function applyActualMetricsUpdate(target: AnyObj, incoming: AnyObj) {
  const fields = ["og", "fg"];
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(incoming, field)) {
      target[field] = toNumberOrUndefined(incoming[field]);
    }
  });
}

function attachComputedFields(brew: any) {
  const data = toPlainObject(brew);
  const steps = Array.isArray(data?.recipeSnapshot?.steps)
    ? data.recipeSnapshot.steps
    : [];

  const rawStepProgress = Array.isArray(data?.progress?.stepProgress)
    ? data.progress.stepProgress
    : [];
  const now = new Date();
  const stepProgress = rawStepProgress.map((entry: any) => {
    const elapsedSeconds = elapsedSecondsForEntry(entry, now);
    const actualDurationSeconds = toNumberOrUndefined(entry.actualDurationSeconds);
    return {
      ...entry,
      elapsedSeconds,
      loggedDurationSeconds:
        actualDurationSeconds !== undefined ? actualDurationSeconds : elapsedSeconds,
    };
  });

  const currentStepIndex = clampIndex(data?.progress?.currentStepIndex || 0, steps.length);
  const currentStep = steps[currentStepIndex] || null;
  const currentStepProgress = currentStep
    ? stepProgress.find((entry: any) => entry.stepId === currentStep.stepId) || null
    : null;
  const actualOg = toNumberOrUndefined(data?.actualMetrics?.og);
  const actualFg = toNumberOrUndefined(data?.actualMetrics?.fg);
  const actualAbv =
    actualOg !== undefined && actualFg !== undefined
      ? Number(Math.max(0, (actualOg - actualFg) * 131.25).toFixed(2))
      : undefined;

  return {
    ...data,
    actualMetrics: {
      ...(data.actualMetrics || {}),
      og: actualOg,
      fg: actualFg,
      abv: actualAbv,
    },
    progress: {
      ...(data.progress || {}),
      currentStepIndex,
      stepProgress,
    },
    currentStep,
    currentStepProgress,
  };
}

function notifyBrewUpdated(brew: any) {
  const brewId = String(brew?._id || "");
  if (!brewId) return;
  broadcastBrewUpdate(brewId);
}

function extractBearerToken(req: any) {
  const header = req.headers?.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function normalizeUsername(input: string) {
  return String(input || "demo-brewer")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 40);
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

function getDefaultTargetMetrics(snapshot: any) {
  const defaults = snapshot?.defaults || {};
  const ogFrom = gravityToNumber(defaults.ogFrom);
  const ogTo = gravityToNumber(defaults.ogTo);
  const fgFrom = gravityToNumber(defaults.fgFrom);
  const fgTo = gravityToNumber(defaults.fgTo);

  const og = ogFrom !== undefined && ogTo !== undefined ? (ogFrom + ogTo) / 2 : ogFrom || ogTo;
  const fg = fgFrom !== undefined && fgTo !== undefined ? (fgFrom + fgTo) / 2 : fgFrom || fgTo;

  return {
    og: og !== undefined ? Number(og.toFixed(3)) : undefined,
    fg: fg !== undefined ? Number(fg.toFixed(3)) : undefined,
    co2Volumes: toNumberOrUndefined(defaults.co2Volumes),
    ibu: toNumberOrUndefined(defaults.ibu),
  };
}

brewsRouter.post("/from-recipe/:recipeId", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const recipe = await Recipe.findOne({ _id: req.params.recipeId, brewerId });

    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const snapshot = normalizeRecipeSnapshot({}, recipe);
    const stepProgress = buildStepProgress(snapshot.steps, []);
    const plannedStartAt =
      toDateOrUndefined(req.body?.plannedStartAt) || toDateOrUndefined(req.body?.timeline?.plannedStartAt);

    const brew = await Brew.create({
      brewerId,
      recipeId: recipe._id,
      name: toStringOrUndefined(req.body?.name) || snapshot.name || "Nytt Brygg",
      status: "planned",
      notes: toStringOrUndefined(req.body?.notes),
      timeline: {
        plannedStartAt,
      },
      targetMetrics: {
        ...getDefaultTargetMetrics(snapshot),
      },
      actualMetrics: {
        og: toNumberOrUndefined(req.body?.actualMetrics?.og),
        fg: toNumberOrUndefined(req.body?.actualMetrics?.fg),
      },
      recipeSnapshot: snapshot,
      progress: {
        currentStepIndex: 0,
        stepProgress,
      },
      measurements: [],
    });

    notifyBrewUpdated(brew);
    return res.status(201).json(attachComputedFields(brew));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to create planned brew" });
  }
});

brewsRouter.post("/", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const payload = req.body || {};

    let sourceRecipe = null;
    if (payload.recipeId) {
      sourceRecipe = await Recipe.findOne({ _id: payload.recipeId, brewerId });
      if (!sourceRecipe) {
        return res.status(400).json({ error: "recipeId does not belong to this brewer" });
      }
    }

    const snapshot = normalizeRecipeSnapshot(payload.recipeSnapshot || {}, sourceRecipe || {});
    const stepProgress = buildStepProgress(
      snapshot.steps,
      payload?.progress?.stepProgress || [],
    );

    const status = normalizeStatus(payload.status) || "planned";

    const brew = await Brew.create({
      brewerId,
      recipeId: payload.recipeId || snapshot.recipeId || undefined,
      name: toStringOrUndefined(payload.name) || snapshot.name || "Nytt Brygg",
      status,
      notes: toStringOrUndefined(payload.notes),
      timeline: {
        plannedStartAt: toDateOrUndefined(payload?.timeline?.plannedStartAt),
        brewDayAt: toDateOrUndefined(payload?.timeline?.brewDayAt),
        fermentationStartAt: toDateOrUndefined(payload?.timeline?.fermentationStartAt),
        fermentationEndAt: toDateOrUndefined(payload?.timeline?.fermentationEndAt),
        bottledAt: toDateOrUndefined(payload?.timeline?.bottledAt),
        keggedAt: toDateOrUndefined(payload?.timeline?.keggedAt),
        completedAt: toDateOrUndefined(payload?.timeline?.completedAt),
      },
      targetMetrics: {
        ...getDefaultTargetMetrics(snapshot),
        gravity: toNumberOrUndefined(payload?.targetMetrics?.gravity),
        og:
          toNumberOrUndefined(payload?.targetMetrics?.og) ||
          getDefaultTargetMetrics(snapshot).og,
        fg:
          toNumberOrUndefined(payload?.targetMetrics?.fg) ||
          getDefaultTargetMetrics(snapshot).fg,
        sg: toNumberOrUndefined(payload?.targetMetrics?.sg),
        co2Volumes:
          toNumberOrUndefined(payload?.targetMetrics?.co2Volumes) ||
          getDefaultTargetMetrics(snapshot).co2Volumes,
        ibu:
          toNumberOrUndefined(payload?.targetMetrics?.ibu) ||
          getDefaultTargetMetrics(snapshot).ibu,
        ph: toNumberOrUndefined(payload?.targetMetrics?.ph),
      },
      actualMetrics: {
        og: toNumberOrUndefined(payload?.actualMetrics?.og),
        fg: toNumberOrUndefined(payload?.actualMetrics?.fg),
      },
      recipeSnapshot: snapshot,
      progress: {
        currentStepIndex: clampIndex(payload?.progress?.currentStepIndex || 0, snapshot.steps.length),
        brewStartedAt: toDateOrUndefined(payload?.progress?.brewStartedAt),
        brewCompletedAt: toDateOrUndefined(payload?.progress?.brewCompletedAt),
        stepProgress,
      },
      measurements: Array.isArray(payload.measurements) ? payload.measurements : [],
    });

    notifyBrewUpdated(brew);
    return res.status(201).json(attachComputedFields(brew));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to create brew" });
  }
});

brewsRouter.get("/current", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);

    const candidates = await Brew.find({
      brewerId,
      status: { $in: ["active", "conditioning", "planned"] },
    }).sort({ updatedAt: -1 });

    if (!candidates.length) {
      return res.json(null);
    }

    const priority: Record<string, number> = {
      active: 0,
      conditioning: 1,
      planned: 2,
    };

    candidates.sort((a: any, b: any) => {
      const pa = priority[a.status] ?? 99;
      const pb = priority[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return res.json(attachComputedFields(candidates[0]));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to get current brew" });
  }
});

brewsRouter.get("/", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const filter: any = { brewerId };
    const q = req.query?.q ? String(req.query.q).trim() : "";

    if (req.query.status) {
      const statuses = String(req.query.status)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => ALLOWED_STATUSES.has(s));

      if (statuses.length === 1) {
        filter.status = statuses[0];
      } else if (statuses.length > 1) {
        filter.status = { $in: statuses };
      }
    }

    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { "recipeSnapshot.name": rx }, { notes: rx }];
    }

    const brews = await Brew.find(filter).sort({ updatedAt: -1 });
    return res.json(brews.map((brew: any) => attachComputedFields(brew)));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to list brews" });
  }
});

brewsRouter.get("/:id", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const brew = await Brew.findOne({ _id: req.params.id, brewerId });
    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }
    return res.json(attachComputedFields(brew));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to get brew" });
  }
});

brewsRouter.patch("/:id", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const payload = req.body || {};
    const brew = await Brew.findOne({ _id: req.params.id, brewerId });

    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    let sourceForSnapshot: any = toPlainObject(brew.recipeSnapshot || {});

    if (Object.prototype.hasOwnProperty.call(payload, "recipeId") && payload.recipeId) {
      const recipe = await Recipe.findOne({ _id: payload.recipeId, brewerId });
      if (!recipe) {
        return res
          .status(400)
          .json({ error: "recipeId does not belong to this brewer" });
      }
      brew.recipeId = recipe._id;
      sourceForSnapshot = recipe;
    }

    const shouldUpdateSnapshot =
      payload.recipeSnapshot !== undefined ||
      Object.prototype.hasOwnProperty.call(payload, "recipeId");

    if (payload.name !== undefined) {
      brew.name = toStringOrUndefined(payload.name) || brew.name;
    }

    if (payload.status !== undefined) {
      const nextStatus = normalizeStatus(payload.status);
      if (nextStatus) brew.status = nextStatus;
    }

    if (payload.notes !== undefined) {
      brew.notes = toStringOrUndefined(payload.notes);
    }

    if (!brew.timeline) brew.timeline = {};
    if (payload.timeline && typeof payload.timeline === "object") {
      applyTimelineUpdate(brew.timeline, payload.timeline);
    }

    if (!brew.targetMetrics) brew.targetMetrics = {};
    if (payload.targetMetrics && typeof payload.targetMetrics === "object") {
      applyTargetMetricsUpdate(brew.targetMetrics, payload.targetMetrics);
    }

    if (!brew.actualMetrics) brew.actualMetrics = {};
    if (payload.actualMetrics && typeof payload.actualMetrics === "object") {
      applyActualMetricsUpdate(brew.actualMetrics, payload.actualMetrics);
    }

    if (shouldUpdateSnapshot) {
      const nextSnapshot = normalizeRecipeSnapshot(
        payload.recipeSnapshot || {},
        sourceForSnapshot,
      );
      brew.recipeSnapshot = nextSnapshot;
      brew.progress = brew.progress || {};
      brew.progress.stepProgress = buildStepProgress(
        nextSnapshot.steps,
        brew.progress.stepProgress || [],
      );
      brew.progress.currentStepIndex = clampIndex(
        brew.progress.currentStepIndex || 0,
        nextSnapshot.steps.length,
      );

      if (!brew.name && nextSnapshot.name) {
        brew.name = nextSnapshot.name;
      }
    }

    if (!brew.progress) brew.progress = {};

    if (payload.progress && typeof payload.progress === "object") {
      if (Object.prototype.hasOwnProperty.call(payload.progress, "currentStepIndex")) {
        brew.progress.currentStepIndex = clampIndex(
          payload.progress.currentStepIndex,
          brew.recipeSnapshot?.steps?.length || 0,
        );
      }

      if (Object.prototype.hasOwnProperty.call(payload.progress, "brewStartedAt")) {
        brew.progress.brewStartedAt = toDateOrUndefined(payload.progress.brewStartedAt);
      }

      if (Object.prototype.hasOwnProperty.call(payload.progress, "brewCompletedAt")) {
        brew.progress.brewCompletedAt = toDateOrUndefined(payload.progress.brewCompletedAt);
      }

      if (Object.prototype.hasOwnProperty.call(payload.progress, "stepProgress")) {
        brew.progress.stepProgress = buildStepProgress(
          brew.recipeSnapshot?.steps || [],
          payload.progress.stepProgress || [],
        );
      }
    }

    await brew.save();
    notifyBrewUpdated(brew);
    return res.json(attachComputedFields(brew));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to update brew" });
  }
});

brewsRouter.patch("/:id/current-step", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const brew = await Brew.findOne({ _id: req.params.id, brewerId });

    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    brew.progress = brew.progress || {};
    brew.progress.currentStepIndex = clampIndex(
      req.body?.index,
      brew.recipeSnapshot?.steps?.length || 0,
    );

    await brew.save();
    notifyBrewUpdated(brew);
    return res.json(attachComputedFields(brew));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to set current step" });
  }
});

brewsRouter.post("/:id/start", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const brew = await Brew.findOne({ _id: req.params.id, brewerId });

    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    const now = new Date();
    brew.status = "active";
    brew.timeline = brew.timeline || {};
    brew.progress = brew.progress || {};

    if (!brew.timeline.brewDayAt) brew.timeline.brewDayAt = now;
    if (!brew.progress.brewStartedAt) brew.progress.brewStartedAt = now;

    const steps = Array.isArray(brew.recipeSnapshot?.steps) ? brew.recipeSnapshot.steps : [];
    brew.progress.stepProgress = buildStepProgress(steps, brew.progress.stepProgress || []);
    brew.progress.currentStepIndex = clampIndex(brew.progress.currentStepIndex || 0, steps.length);

    await brew.save();
    notifyBrewUpdated(brew);
    return res.json(attachComputedFields(brew));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to start brew" });
  }
});

brewsRouter.post("/:id/steps/:stepId/start", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const brew = await Brew.findOne({ _id: req.params.id, brewerId });

    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    const steps = Array.isArray(brew.recipeSnapshot?.steps) ? brew.recipeSnapshot.steps : [];
    const stepIndex = steps.findIndex((step: any) => step.stepId === req.params.stepId);

    if (stepIndex < 0) {
      return res.status(404).json({ error: "Step not found" });
    }

    const step = steps[stepIndex];
    const now = new Date();

    brew.status = "active";
    brew.progress = brew.progress || {};
    brew.timeline = brew.timeline || {};

    if (!brew.progress.brewStartedAt) brew.progress.brewStartedAt = now;
    if (!brew.timeline.brewDayAt) brew.timeline.brewDayAt = now;

    const progressEntries = buildStepProgress(steps, brew.progress.stepProgress || []);
    progressEntries.forEach((entry: any) => {
      if (entry.stepId !== step.stepId && entry.status === "active") {
        const nowMs = now.getTime();
        const remainingSeconds = secondsRemainingFromEntry(entry, nowMs);
        accumulateElapsedOnEntry(entry, now);
        entry.status = "pending";
        entry.timerEndsAt = undefined;
        entry.pausedRemainingSeconds =
          remainingSeconds !== undefined && remainingSeconds >= 0 ? remainingSeconds : 0;
      }
    });

    const currentEntry = progressEntries.find((entry: any) => entry.stepId === step.stepId);

    if (!currentEntry) {
      return res.status(500).json({ error: "Could not create step progress entry" });
    }

    const explicitDurationSeconds = toNumberOrUndefined(req.body?.durationSeconds);
    const stepDurationSeconds =
      toNumberOrUndefined(step.durationMinutes) !== undefined
        ? Number(step.durationMinutes) * 60
        : undefined;
    const existingDurationSeconds = toNumberOrUndefined(currentEntry.timerDurationSeconds);
    const pausedRemainingSeconds = toNumberOrUndefined(currentEntry.pausedRemainingSeconds);

    const timerDurationSeconds =
      explicitDurationSeconds && explicitDurationSeconds > 0
        ? explicitDurationSeconds
        : existingDurationSeconds && existingDurationSeconds > 0
          ? existingDurationSeconds
          : stepDurationSeconds && stepDurationSeconds > 0
            ? stepDurationSeconds
            : undefined;

    const activeCountdownSeconds =
      explicitDurationSeconds && explicitDurationSeconds > 0
        ? explicitDurationSeconds
        : pausedRemainingSeconds !== undefined && pausedRemainingSeconds >= 0
          ? pausedRemainingSeconds
          : stepDurationSeconds && stepDurationSeconds > 0
            ? stepDurationSeconds
            : timerDurationSeconds;

    const wasCompleted = currentEntry.status === "completed";
    currentEntry.status = "active";
    if (wasCompleted) {
      currentEntry.startedAt = now;
      currentEntry.accumulatedActiveSeconds = 0;
      currentEntry.completedAt = undefined;
      currentEntry.actualDurationSeconds = undefined;
    } else {
      currentEntry.startedAt = currentEntry.startedAt || now;
    }
    currentEntry.activeSinceAt = now;
    currentEntry.timerDurationSeconds = timerDurationSeconds;
    currentEntry.pausedRemainingSeconds = undefined;
    currentEntry.timerEndsAt =
      activeCountdownSeconds !== undefined && activeCountdownSeconds >= 0
        ? new Date(now.getTime() + activeCountdownSeconds * 1000)
        : undefined;

    if (
      step.stepType === "primary_fermentation" ||
      step.stepType === "secondary_fermentation"
    ) {
      if (!brew.timeline.fermentationStartAt) {
        brew.timeline.fermentationStartAt = now;
      }
    }

    brew.progress.stepProgress = progressEntries;
    brew.progress.currentStepIndex = stepIndex;

    await brew.save();
    notifyBrewUpdated(brew);
    return res.json(attachComputedFields(brew));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to start step" });
  }
});

brewsRouter.post("/:id/steps/:stepId/pause", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const brew = await Brew.findOne({ _id: req.params.id, brewerId });

    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    const steps = Array.isArray(brew.recipeSnapshot?.steps) ? brew.recipeSnapshot.steps : [];
    const stepIndex = steps.findIndex((step: any) => step.stepId === req.params.stepId);

    if (stepIndex < 0) {
      return res.status(404).json({ error: "Step not found" });
    }

    brew.progress = brew.progress || {};
    const progressEntries = buildStepProgress(steps, brew.progress.stepProgress || []);
    const entry = progressEntries.find((p: any) => p.stepId === req.params.stepId);

    if (!entry) {
      return res.status(500).json({ error: "Could not find step progress entry" });
    }

    if (entry.status !== "active") {
      return res.status(400).json({ error: "Step is not active" });
    }

    const nowMs = Date.now();
    const remainingSeconds = secondsRemainingFromEntry(entry, nowMs);
    accumulateElapsedOnEntry(entry, new Date(nowMs));

    entry.status = "pending";
    entry.timerEndsAt = undefined;
    entry.pausedRemainingSeconds =
      remainingSeconds !== undefined && remainingSeconds >= 0 ? remainingSeconds : 0;

    brew.progress.stepProgress = progressEntries;
    brew.progress.currentStepIndex = stepIndex;

    await brew.save();
    notifyBrewUpdated(brew);
    return res.json(attachComputedFields(brew));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to pause step" });
  }
});

brewsRouter.post("/:id/steps/:stepId/complete", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const brew = await Brew.findOne({ _id: req.params.id, brewerId });

    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    const steps = Array.isArray(brew.recipeSnapshot?.steps) ? brew.recipeSnapshot.steps : [];
    const stepIndex = steps.findIndex((step: any) => step.stepId === req.params.stepId);

    if (stepIndex < 0) {
      return res.status(404).json({ error: "Step not found" });
    }

    brew.progress = brew.progress || {};
    brew.timeline = brew.timeline || {};

    const progressEntries = buildStepProgress(steps, brew.progress.stepProgress || []);
    const entry = progressEntries.find((p: any) => p.stepId === req.params.stepId);

    if (!entry) {
      return res.status(500).json({ error: "Could not find step progress entry" });
    }

    const now = new Date();
    if (entry.status === "active") {
      accumulateElapsedOnEntry(entry, now);
    }
    entry.status = "completed";
    entry.completedAt = now;
    entry.activeSinceAt = undefined;
    entry.timerDurationSeconds = undefined;
    entry.timerEndsAt = undefined;
    entry.pausedRemainingSeconds = undefined;
    entry.actualDurationSeconds = toNumberOrUndefined(entry.accumulatedActiveSeconds) || 0;

    const step = steps[stepIndex];
    if (
      step?.stepType === "primary_fermentation" ||
      step?.stepType === "secondary_fermentation"
    ) {
      brew.timeline.fermentationEndAt = now;
    }

    const allCompleted = progressEntries.length
      ? progressEntries.every((p: any) => p.status === "completed")
      : false;

    if (allCompleted) {
      brew.status = "completed";
      brew.progress.brewCompletedAt = now;
      brew.timeline.completedAt = now;
    } else {
      if (brew.status === "planned") brew.status = "active";
      brew.progress.currentStepIndex = clampIndex(stepIndex + 1, steps.length);
    }

    brew.progress.stepProgress = progressEntries;

    await brew.save();
    notifyBrewUpdated(brew);
    return res.json(attachComputedFields(brew));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to complete step" });
  }
});

brewsRouter.post("/:id/steps/:stepId/reset", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const brew = await Brew.findOne({ _id: req.params.id, brewerId });

    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    const steps = Array.isArray(brew.recipeSnapshot?.steps) ? brew.recipeSnapshot.steps : [];
    const stepIndex = steps.findIndex((step: any) => step.stepId === req.params.stepId);

    if (stepIndex < 0) {
      return res.status(404).json({ error: "Step not found" });
    }

    brew.progress = brew.progress || {};

    const progressEntries = buildStepProgress(steps, brew.progress.stepProgress || []);
    const entry = progressEntries.find((p: any) => p.stepId === req.params.stepId);

    if (!entry) {
      return res.status(500).json({ error: "Could not find step progress entry" });
    }

    entry.status = "pending";
    entry.startedAt = undefined;
    entry.activeSinceAt = undefined;
    entry.completedAt = undefined;
    entry.timerDurationSeconds = undefined;
    entry.timerEndsAt = undefined;
    entry.pausedRemainingSeconds = undefined;
    entry.accumulatedActiveSeconds = 0;
    entry.actualDurationSeconds = undefined;

    brew.progress.stepProgress = progressEntries;

    await brew.save();
    notifyBrewUpdated(brew);
    return res.json(attachComputedFields(brew));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to reset step" });
  }
});

brewsRouter.delete("/:id", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const brew = await Brew.findOneAndDelete({ _id: req.params.id, brewerId });
    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }
    broadcastBrewDeleted(String(brew._id));
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to delete brew" });
  }
});

brewsRouter.post("/:id/measurements", async (req: any, res) => {
  try {
    const brewerId = await resolveBrewerId(req);
    const brew = await Brew.findOne({ _id: req.params.id, brewerId });
    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    const measurement = {
      takenAt: toDateOrUndefined(req.body?.takenAt) || new Date(),
      gravity: toNumberOrUndefined(req.body?.gravity),
      temperatureC: toNumberOrUndefined(req.body?.temperatureC),
      og: toNumberOrUndefined(req.body?.og),
      fg: toNumberOrUndefined(req.body?.fg),
      sg: toNumberOrUndefined(req.body?.sg),
      ph: toNumberOrUndefined(req.body?.ph),
      co2Volumes: toNumberOrUndefined(req.body?.co2Volumes),
      ibu: toNumberOrUndefined(req.body?.ibu),
      note: toStringOrUndefined(req.body?.note),
    };

    brew.measurements.push(measurement as any);
    await brew.save();
    notifyBrewUpdated(brew);

    return res.status(201).json(brew.measurements[brew.measurements.length - 1]);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to add measurement" });
  }
});

brewsRouter.get("/:id/graph", async (req: any, res) => {
  try {
    const metric = String(req.query.metric || "temperatureC");
    const allowed = [
      "gravity",
      "temperatureC",
      "og",
      "fg",
      "sg",
      "ph",
      "co2Volumes",
      "ibu",
    ];

    if (!allowed.includes(metric)) {
      return res
        .status(400)
        .json({ error: `Invalid metric. Allowed: ${allowed.join(", ")}` });
    }

    const brewerId = await resolveBrewerId(req);
    const brew = await Brew.findOne({ _id: req.params.id, brewerId }).select(
      "measurements name status",
    );

    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    const points = brew.measurements
      .map((m: any) => ({
        at: m.takenAt,
        value: m[metric],
      }))
      .filter((p: any) => p.value !== undefined && p.value !== null)
      .sort(
        (a: any, b: any) =>
          new Date(a.at).getTime() - new Date(b.at).getTime(),
      );

    return res.json({
      brewId: String(req.params.id),
      metric,
      points,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to build graph series" });
  }
});
