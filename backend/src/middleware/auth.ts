import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = req.headers.cookie || "";
    const token = raw
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("hp_token="))
      ?.split("=")[1];

    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as JwtPayload | string;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export default authenticate;
