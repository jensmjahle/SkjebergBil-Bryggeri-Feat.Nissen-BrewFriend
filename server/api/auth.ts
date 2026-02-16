import { Router } from "express";
import bcrypt from "bcryptjs";
import { Brewer } from "../mongo/models/Brewer.js";
import { signBrewerJwt } from "../mongo/auth.js";

export const authRouter = Router();

function sanitizeBrewer(doc: any) {
  return {
    id: String(doc._id),
    username: doc.username,
    name: doc.name,
    phoneNumber: doc.phoneNumber,
    profileImageUrl: doc.profileImageUrl,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

authRouter.post("/register", async (req, res) => {
  try {
    const { username, name, phoneNumber, password, profileImageUrl } = req.body || {};

    if (!username || !name || !password) {
      return res.status(400).json({ error: "username, name and password are required" });
    }

    const existing = await Brewer.findOne({ username: String(username).toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: "username already exists" });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    const brewer = await Brewer.create({
      username,
      name,
      phoneNumber,
      passwordHash,
      profileImageUrl,
    });

    const token = signBrewerJwt({
      sub: String(brewer._id),
      username: brewer.username,
      role: "BREWER",
    });

    return res.status(201).json({ token, brewer: sanitizeBrewer(brewer) });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to register brewer" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }

    const brewer = await Brewer.findOne({ username: String(username).toLowerCase().trim() });

    if (!brewer) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(String(password), brewer.passwordHash);

    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signBrewerJwt({
      sub: String(brewer._id),
      username: brewer.username,
      role: "BREWER",
    });

    return res.json({ token, brewer: sanitizeBrewer(brewer) });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to login" });
  }
});
