import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { connectMongo, mongoStatus } from "./mongo/connection.js";

process.on("unhandledRejection", (e) =>
  console.error("[server] UnhandledRejection:", e),
);
process.on("uncaughtException", (e) =>
  console.error("[server] UncaughtException:", e),
);

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// ensure uploads dir exists, then serve it
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

const mongoConnected = await connectMongo();
if (mongoConnected) {
  console.log("[server] MongoDB connected");
} else {
  console.log("[server] MONGODB_URI not set, Mongo routes disabled");
}

app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    mongo: mongoStatus(),
  }),
);

// mount routers (ESM .js imports)
const { authRouter } = await import("./api/auth.js");
const { brewersRouter } = await import("./api/brewers.js");
const { recipesRouter } = await import("./api/recipes.js");
const { brewsRouter } = await import("./api/brews.js");
const { uploadsRouter } = await import("./api/uploads.js");

if (mongoConnected) {
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/brewers", brewersRouter);
  app.use("/api/recipes", recipesRouter);
  app.use("/api/brews", brewsRouter);
} else {
  app.use("/api", (_req, res) =>
    res.status(503).json({ error: "MongoDB is not configured (set MONGODB_URI)" }),
  );
}

const PORT = Number(process.env.PORT || 3000);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
});

