import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

import { db } from "../db";
import { users } from "../db/schema";
import { hashPassword } from "../utils/hash";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signJwt(payload: any) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return (jwt.sign as any)(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({
        error: "Missing required fields: email, name, and password are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
      });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await db
      .insert(users)
      .values({
        email,
        name,
        password: hashedPassword,
      })
      .returning();

    const { password: _, ...userResponse } = newUser[0];

    // Create JWT token and set cookie to automatically log in the user
    const token = signJwt({ sub: String(newUser[0].id), email: newUser[0].email });

    const isProd = (process.env.APP_ENV ?? process.env.NODE_ENV) === "production";
    res.cookie("hp_token", token, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.status(201).json({
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
