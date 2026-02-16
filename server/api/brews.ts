import { Router } from "express";
import { requireBrewer } from "../mongo/auth.js";
import { Brew } from "../mongo/models/Brew.js";
import { Recipe } from "../mongo/models/Recipe.js";

export const brewsRouter = Router();

brewsRouter.use(requireBrewer);

brewsRouter.post("/", async (req: any, res) => {
  try {
    const brewerId = req.brewer.sub;
    const payload = req.body || {};

    if (!payload.name) {
      return res.status(400).json({ error: "Brew name is required" });
    }

    if (payload.recipeId) {
      const recipe = await Recipe.findOne({ _id: payload.recipeId, brewerId });
      if (!recipe) {
        return res.status(400).json({ error: "recipeId does not belong to this brewer" });
      }
    }

    const brew = await Brew.create({
      brewerId,
      recipeId: payload.recipeId || undefined,
      name: payload.name,
      status: payload.status,
      notes: payload.notes,
      timeline: payload.timeline || {},
      targetMetrics: payload.targetMetrics || {},
      measurements: Array.isArray(payload.measurements) ? payload.measurements : [],
    });

    return res.status(201).json(brew);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to create brew" });
  }
});

brewsRouter.get("/", async (req: any, res) => {
  try {
    const filter: any = { brewerId: req.brewer.sub };
    if (req.query.status) {
      filter.status = String(req.query.status);
    }

    const brews = await Brew.find(filter).sort({ createdAt: -1 });
    return res.json(brews);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to list brews" });
  }
});

brewsRouter.get("/:id", async (req: any, res) => {
  try {
    const brew = await Brew.findOne({ _id: req.params.id, brewerId: req.brewer.sub });
    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }
    return res.json(brew);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to get brew" });
  }
});

brewsRouter.patch("/:id", async (req: any, res) => {
  try {
    const brew = await Brew.findOneAndUpdate(
      { _id: req.params.id, brewerId: req.brewer.sub },
      req.body || {},
      { new: true, runValidators: true },
    );

    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    return res.json(brew);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to update brew" });
  }
});

brewsRouter.delete("/:id", async (req: any, res) => {
  try {
    const brew = await Brew.findOneAndDelete({ _id: req.params.id, brewerId: req.brewer.sub });
    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to delete brew" });
  }
});

brewsRouter.post("/:id/measurements", async (req: any, res) => {
  try {
    const brew = await Brew.findOne({ _id: req.params.id, brewerId: req.brewer.sub });
    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    const measurement = {
      takenAt: req.body?.takenAt || new Date(),
      temperatureC: req.body?.temperatureC,
      og: req.body?.og,
      fg: req.body?.fg,
      sg: req.body?.sg,
      ph: req.body?.ph,
      co2Volumes: req.body?.co2Volumes,
      ibu: req.body?.ibu,
      note: req.body?.note,
    };

    brew.measurements.push(measurement as any);
    await brew.save();

    return res.status(201).json(brew.measurements[brew.measurements.length - 1]);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to add measurement" });
  }
});

brewsRouter.get("/:id/graph", async (req: any, res) => {
  try {
    const metric = String(req.query.metric || "temperatureC");
    const allowed = ["temperatureC", "og", "fg", "sg", "ph", "co2Volumes", "ibu"];

    if (!allowed.includes(metric)) {
      return res.status(400).json({ error: `Invalid metric. Allowed: ${allowed.join(", ")}` });
    }

    const brew = await Brew.findOne({ _id: req.params.id, brewerId: req.brewer.sub }).select("measurements name status");
    if (!brew) {
      return res.status(404).json({ error: "Brew not found" });
    }

    const points = brew.measurements
      .map((m: any) => ({
        at: m.takenAt,
        value: m[metric],
      }))
      .filter((p: any) => p.value !== undefined && p.value !== null)
      .sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return res.json({
      brewId: String(req.params.id),
      metric,
      points,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to build graph series" });
  }
});
