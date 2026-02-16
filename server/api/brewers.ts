import { Router } from "express";
import { requireBrewer } from "../mongo/auth.js";
import { Brewer } from "../mongo/models/Brewer.js";

export const brewersRouter = Router();

brewersRouter.get("/me", requireBrewer, async (req: any, res) => {
  try {
    const brewer = await Brewer.findById(req.brewer.sub).select("-passwordHash");
    if (!brewer) {
      return res.status(404).json({ error: "Brewer not found" });
    }
    return res.json(brewer);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to load brewer" });
  }
});

brewersRouter.patch("/me", requireBrewer, async (req: any, res) => {
  try {
    const updates: any = {};
    const allowed = ["name", "phoneNumber", "profileImageUrl"];

    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        updates[field] = req.body[field];
      }
    }

    const brewer = await Brewer.findByIdAndUpdate(req.brewer.sub, updates, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    if (!brewer) {
      return res.status(404).json({ error: "Brewer not found" });
    }

    return res.json(brewer);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to update brewer" });
  }
});
