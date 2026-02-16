import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

type BrewerTokenPayload = {
  sub: string;
  username: string;
  role: "BREWER";
};

export function signBrewerJwt(payload: BrewerTokenPayload) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function requireBrewer(req: any, res: any, next: any) {
  const h = req.headers["authorization"] || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as BrewerTokenPayload;
    if (decoded.role !== "BREWER") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.brewer = decoded;
    next();
  } catch (_err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
