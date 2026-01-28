import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { eq, and } from "drizzle-orm";

import { db } from "../db";
import { patientUsers, patients } from "../db/schema";
import { isCaretaker, hasAccessToPatientViaOrganisation } from "../utils/organisationContext";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

export function getUserIdFromRequest(req: Request): number | null {
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

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as JwtPayload | string;
    const sub = typeof decoded === "string" ? undefined : decoded.sub;
    return sub ? Number(sub) : null;
  } catch (err) {
    return null;
  }
}

export async function hasPatientAccess(userId: number, patientId: number): Promise<boolean> {
  const isUserCaretaker = await isCaretaker(userId);

  if (isUserCaretaker) {
    return hasAccessToPatientViaOrganisation(userId, patientId);
  }

  const result = await db
    .select()
    .from(patientUsers)
    .where(and(eq(patientUsers.patientId, patientId), eq(patientUsers.userId, userId)))
    .limit(1);

  return result.length > 0;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
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

    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as JwtPayload | string;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requirePatientAccess(req: Request, res: Response, next: NextFunction) {
  (async () => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const patientId = Number(req.params.id || req.params.patientId);
      if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: "Patient ID required" });
      }

      const hasAccess = await hasPatientAccess(userId, patientId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to this patient" });
      }

      (req as any).userId = userId;
      (req as any).patientId = patientId;
      next();
    } catch (err) {
      console.error("Error in requirePatientAccess:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  })();
}

export function requireCaretakerAccess(req: Request, res: Response, next: NextFunction) {
  (async () => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const isUserCaretaker = await isCaretaker(userId);
      if (!isUserCaretaker) {
        return res.status(403).json({ error: "Only caretakers can access this resource" });
      }

      (req as any).userId = userId;
      next();
    } catch (err) {
      console.error("Error in requireCaretakerAccess:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  })();
}

export default authenticate;
