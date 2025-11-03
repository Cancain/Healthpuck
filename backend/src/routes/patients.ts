import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";

import { db } from "../db";
import { patients, patientUsers, users } from "../db/schema";
import { getUserIdFromRequest, authenticate, requirePatientAccess } from "../middleware/auth";

const router = Router();

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, email, dateOfBirth } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const newPatient = await db
      .insert(patients)
      .values({
        name,
        email: email || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        createdBy: userId,
      })
      .returning();

    const patient = newPatient[0];

    await db.insert(patientUsers).values({
      patientId: patient.id,
      userId: userId,
      role: "caregiver",
      acceptedAt: new Date(),
    });

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
      return res.status(404).json({ error: "User not found" });
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

export default router;
