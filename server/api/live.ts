import { Router } from "express";
import { addBrewClient } from "../live/brewLive.js";

export const liveRouter = Router();

liveRouter.get("/brews/:brewId/stream", (req, res) => {
  const brewId = String(req.params.brewId || "").trim();
  if (!brewId) {
    return res.status(400).json({ error: "brewId is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const cleanup = addBrewClient(brewId, res);

  req.on("close", () => {
    cleanup();
    res.end();
  });
});
