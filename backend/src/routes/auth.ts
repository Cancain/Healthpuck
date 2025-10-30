import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "../utils/hash";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signJwt(payload: any) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return (jwt.sign as any)(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
}

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = rows[0];

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signJwt({ sub: String(user.id), email: user.email });

    res.cookie("hp_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const { password: _pw, ...safe } = user as any;
    return res.json({ user: safe });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const raw = req.headers.cookie || "";
    const token = raw
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("hp_token="))
      ?.split("=")[1];

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as jwt.JwtPayload | string;
    const sub = typeof decoded === "string" ? undefined : decoded.sub;
    const userId = Number(sub);
    const rows = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("/me error", err);
    return res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  try {
    res.cookie("hp_token", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
