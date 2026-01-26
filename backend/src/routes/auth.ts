import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { users, type User } from "../db/schema";
import { verifyPassword, hashPassword } from "../utils/hash";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signJwt(payload: object): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  // @ts-expect-error - jsonwebtoken types are overly strict for expiresIn
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "En användare med denna e-post finns redan" });
    }

    const hashedPassword = await hashPassword(password);

    let newUser;
    try {
      newUser = await db
        .insert(users)
        .values({
          email,
          name,
          password: hashedPassword,
        })
        .returning();
    } catch (dbError: unknown) {
      const error = dbError as { code?: number; message?: string };
      if (
        error?.code === 19 ||
        error?.message?.includes("UNIQUE constraint") ||
        error?.message?.includes("unique constraint")
      ) {
        return res.status(409).json({ error: "En användare med denna e-post finns redan" });
      }
      throw dbError;
    }

    const token = signJwt({ sub: String(newUser[0].id), email: newUser[0].email });

    const isProd = (process.env.APP_ENV ?? process.env.NODE_ENV) === "production";
    res.cookie("hp_token", token, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const { password: _pw, ...safe } = newUser[0] as User;
    return res.status(201).json({ user: safe, token });
  } catch (err) {
    console.error("Registration error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

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

    const isProd = (process.env.APP_ENV ?? process.env.NODE_ENV) === "production";
    res.cookie("hp_token", token, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const { password: _pw, ...safe } = user as User;
    // Return token in response for mobile clients
    return res.json({ user: safe, token });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    // Check Authorization header first (for mobile clients)
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      // Fall back to cookie-based auth (for web clients)
      const raw = req.headers.cookie || "";
      token = raw
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("hp_token="))
        ?.split("=")[1];
    }

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
    const isProd = (process.env.APP_ENV ?? process.env.NODE_ENV) === "production";
    res.cookie("hp_token", "", {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });
    return res.status(204).send();
  } catch (err: unknown) {
    console.error("Logout error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
