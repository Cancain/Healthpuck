import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";

import { db } from "../db";
import { patients, patientUsers, users } from "../db/schema";
import { getUserIdFromRequest, authenticate, requirePatientAccess } from "../middleware/auth";
import { hashPassword } from "../utils/hash";

const router = Router();

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, email, password, dateOfBirth } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    // Check if user with this email already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    let patientUserId: number;

    if (existingUser.length > 0) {
      // User already exists, but we'll update their password if provided
      // Note: In a real scenario, you might want to check if password update is allowed
      const hashedPassword = await hashPassword(password);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, existingUser[0].id));
      patientUserId = existingUser[0].id;
    } else {
      // Create new user account for the patient
      const hashedPassword = await hashPassword(password);
      const newUser = await db
        .insert(users)
        .values({
          email,
          name,
          password: hashedPassword,
        })
        .returning();
      patientUserId = newUser[0].id;
    }

    // Create patient record
    const newPatient = await db
      .insert(patients)
      .values({
        name,
        email,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        createdBy: userId,
      })
      .returning();

    const patient = newPatient[0];

    // Link caregiver who created the patient (check if already linked)
    const existingCaregiverLink = await db
      .select()
      .from(patientUsers)
      .where(and(eq(patientUsers.patientId, patient.id), eq(patientUsers.userId, userId)))
      .limit(1);

    if (existingCaregiverLink.length === 0) {
      await db.insert(patientUsers).values({
        patientId: patient.id,
        userId: userId,
        role: "caregiver",
        acceptedAt: new Date(),
      });
    }

    // Link patient user to the patient record (check if already linked)
    const existingPatientLink = await db
      .select()
      .from(patientUsers)
      .where(and(eq(patientUsers.patientId, patient.id), eq(patientUsers.userId, patientUserId)))
      .limit(1);

    if (existingPatientLink.length === 0) {
      await db.insert(patientUsers).values({
        patientId: patient.id,
        userId: patientUserId,
        role: "patient",
        acceptedAt: new Date(),
      });
    }

    return res.status(201).json(patient);
  } catch (error) {
    console.error("Error creating patient:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userPatients = await db
      .select({
        patient: patients,
        role: patientUsers.role,
      })
      .from(patientUsers)
      .innerJoin(patients, eq(patientUsers.patientId, patients.id))
      .where(eq(patientUsers.userId, userId));

    const result = userPatients.map((up) => ({
      ...up.patient,
      role: up.role,
    }));

    return res.json(result);
  } catch (error) {
    console.error("Error fetching patients:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requirePatientAccess, async (req: Request, res: Response) => {
  try {
    const patientId = (req as any).patientId;

    const result = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    return res.json(result[0]);
  } catch (error) {
    console.error("Error fetching patient:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/users", requirePatientAccess, async (req: Request, res: Response) => {
  try {
    const patientId = (req as any).patientId;

    const userPatients = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        role: patientUsers.role,
        invitedAt: patientUsers.invitedAt,
        acceptedAt: patientUsers.acceptedAt,
      })
      .from(patientUsers)
      .innerJoin(users, eq(patientUsers.userId, users.id))
      .where(eq(patientUsers.patientId, patientId));

    return res.json(userPatients);
  } catch (error) {
    console.error("Error fetching patient users:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/invite", requirePatientAccess, async (req: Request, res: Response) => {
  try {
    const patientId = (req as any).patientId;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const validRole = role === "patient" || role === "caregiver" ? role : "caregiver";

    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({ error: "User not found. The user must have an account." });
    }

    const invitedUser = userResult[0];

    const existing = await db
      .select()
      .from(patientUsers)
      .where(and(eq(patientUsers.patientId, patientId), eq(patientUsers.userId, invitedUser.id)))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "User already has access to this patient" });
    }

    const invite = await db
      .insert(patientUsers)
      .values({
        patientId,
        userId: invitedUser.id,
        role: validRole,
      })
      .returning();

    return res.status(201).json(invite[0]);
  } catch (error) {
    console.error("Error inviting user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id/users/:userId", requirePatientAccess, async (req: Request, res: Response) => {
  try {
    const patientId = (req as any).patientId;
    const targetUserId = Number(req.params.userId);
    const { role } = req.body;

    if (!role || (role !== "patient" && role !== "caregiver")) {
      return res.status(400).json({ error: "Valid role (patient or caregiver) is required" });
    }

    const updated = await db
      .update(patientUsers)
      .set({ role })
      .where(and(eq(patientUsers.patientId, patientId), eq(patientUsers.userId, targetUserId)))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: "User-patient relationship not found" });
    }

    return res.json(updated[0]);
  } catch (error) {
    console.error("Error updating user role:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/users/:userId", requirePatientAccess, async (req: Request, res: Response) => {
  try {
    const patientId = (req as any).patientId;
    const targetUserId = Number(req.params.userId);

    await db
      .delete(patientUsers)
      .where(and(eq(patientUsers.patientId, patientId), eq(patientUsers.userId, targetUserId)));

    return res.status(204).send();
  } catch (error) {
    console.error("Error removing user access:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requirePatientAccess, async (req: Request, res: Response) => {
  try {
    const patientId = (req as any).patientId;
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is the creator of the patient
    const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);

    if (patient.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    if (patient[0].createdBy !== userId) {
      return res.status(403).json({ error: "Only the creator can delete the patient" });
    }

    // Delete patient (cascade will handle patient_users, medications, etc.)
    await db.delete(patients).where(eq(patients.id, patientId));

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting patient:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
