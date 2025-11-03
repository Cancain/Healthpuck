import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";

import { db } from "../db";
import { medications, medicationIntakes, patients } from "../db/schema";
import {
  getUserIdFromRequest,
  requirePatientAccess,
  hasPatientAccess,
  authenticate,
} from "../middleware/auth";

const router = Router();

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { patientId, name, dosage, frequency, notes } = req.body;

    if (!patientId || !name || !dosage || !frequency) {
      return res.status(400).json({
        error: "patientId, name, dosage, and frequency are required",
      });
    }

    const hasAccess = await hasPatientAccess(userId, patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this patient" });
    }

    const newMedication = await db
      .insert(medications)
      .values({
        patientId,
        name,
        dosage,
        frequency,
        notes: notes || null,
        createdBy: userId,
      })
      .returning();

    return res.status(201).json(newMedication[0]);
  } catch (error) {
    console.error("Error creating medication:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/patient/:patientId", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const patientId = Number(req.params.patientId);

    const hasAccess = await hasPatientAccess(userId, patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this patient" });
    }

    const result = await db.select().from(medications).where(eq(medications.patientId, patientId));

    return res.json(result);
  } catch (error) {
    console.error("Error fetching medications:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const medicationId = Number(req.params.id);

    const result = await db
      .select()
      .from(medications)
      .where(eq(medications.id, medicationId))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: "Medication not found" });
    }

    const medication = result[0];

    const hasAccess = await hasPatientAccess(userId, medication.patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(medication);
  } catch (error) {
    console.error("Error fetching medication:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const medicationId = Number(req.params.id);
    const { name, dosage, frequency, notes } = req.body;

    const existing = await db
      .select()
      .from(medications)
      .where(eq(medications.id, medicationId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Medication not found" });
    }

    const medication = existing[0];

    const hasAccess = await hasPatientAccess(userId, medication.patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await db
      .update(medications)
      .set({
        name: name || medication.name,
        dosage: dosage || medication.dosage,
        frequency: frequency || medication.frequency,
        notes: notes !== undefined ? notes : medication.notes,
        updatedAt: new Date(),
      })
      .where(eq(medications.id, medicationId))
      .returning();

    return res.json(updated[0]);
  } catch (error) {
    console.error("Error updating medication:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const medicationId = Number(req.params.id);

    const existing = await db
      .select()
      .from(medications)
      .where(eq(medications.id, medicationId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Medication not found" });
    }

    const medication = existing[0];

    const hasAccess = await hasPatientAccess(userId, medication.patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    await db.delete(medications).where(eq(medications.id, medicationId));

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting medication:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/intake", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const medicationId = Number(req.params.id);
    const { date } = req.body;

    const medication = await db
      .select()
      .from(medications)
      .where(eq(medications.id, medicationId))
      .limit(1);

    if (medication.length === 0) {
      return res.status(404).json({ error: "Medication not found" });
    }

    const hasAccess = await hasPatientAccess(userId, medication[0].patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const intakeDate = date ? new Date(date) : new Date();
    intakeDate.setHours(0, 0, 0, 0);

    const existing = await db
      .select()
      .from(medicationIntakes)
      .where(
        and(
          eq(medicationIntakes.medicationId, medicationId),
          eq(medicationIntakes.date, intakeDate),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(medicationIntakes)
        .set({
          taken: true,
          takenAt: new Date(),
          takenBy: userId,
        })
        .where(eq(medicationIntakes.id, existing[0].id))
        .returning();

      return res.json(updated[0]);
    } else {
      const newIntake = await db
        .insert(medicationIntakes)
        .values({
          medicationId,
          date: intakeDate,
          taken: true,
          takenAt: new Date(),
          takenBy: userId,
        })
        .returning();

      return res.status(201).json(newIntake[0]);
    }
  } catch (error) {
    console.error("Error recording medication intake:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/intake/:date", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const medicationId = Number(req.params.id);
    const intakeDate = new Date(req.params.date);
    intakeDate.setHours(0, 0, 0, 0);

    const medication = await db
      .select()
      .from(medications)
      .where(eq(medications.id, medicationId))
      .limit(1);

    if (medication.length === 0) {
      return res.status(404).json({ error: "Medication not found" });
    }

    const hasAccess = await hasPatientAccess(userId, medication[0].patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await db
      .select()
      .from(medicationIntakes)
      .where(
        and(
          eq(medicationIntakes.medicationId, medicationId),
          eq(medicationIntakes.date, intakeDate),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      return res.json({ taken: false, date: intakeDate });
    }

    return res.json(result[0]);
  } catch (error) {
    console.error("Error fetching medication intake:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
