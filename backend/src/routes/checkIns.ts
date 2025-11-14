import { Router, Request, Response } from "express";
import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "../db";
import { medications, medicationCheckIns, users, type MedicationCheckIn } from "../db/schema";
import { authenticate, getUserIdFromRequest, hasPatientAccess } from "../middleware/auth";
import { getPatientContextForUser } from "../utils/patientContext";

const router = Router();

const STATUSES = new Set<MedicationCheckIn["status"]>(["taken", "skipped", "missed"]);
const DEFAULT_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 45;
const DEFAULT_LIMIT = 200;

router.get("/", authenticate, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const medicationId = req.query.medicationId ? Number(req.query.medicationId) : undefined;
    if (medicationId !== undefined && Number.isNaN(medicationId)) {
      return res.status(400).json({ error: "Invalid medicationId" });
    }

    let patientId = req.query.patientId ? Number(req.query.patientId) : undefined;
    if (patientId !== undefined && Number.isNaN(patientId)) {
      return res.status(400).json({ error: "Invalid patientId" });
    }

    let medicationRecord: { id: number; patientId: number; name: string } | null = null;
    if (medicationId !== undefined) {
      const [foundMedication] = await db
        .select({ id: medications.id, patientId: medications.patientId, name: medications.name })
        .from(medications)
        .where(eq(medications.id, medicationId))
        .limit(1);

      if (!foundMedication) {
        return res.status(404).json({ error: "Medication not found" });
      }
      medicationRecord = foundMedication;
      if (patientId === undefined) {
        patientId = foundMedication.patientId;
      }
    }

    if (patientId === undefined) {
      const context = await getPatientContextForUser(userId);
      patientId = context.patientId;
    }

    const hasAccess = await hasPatientAccess(userId, patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (medicationRecord && medicationRecord.patientId !== patientId) {
      return res.status(400).json({ error: "Medication does not belong to this patient" });
    }

    const rawRange = req.query.range ? Number(req.query.range) : DEFAULT_RANGE_DAYS;
    const rangeDays = clampRangeDays(rawRange);
    const limit = clampLimit(req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT);

    const end = new Date();
    const start = new Date(end.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    let condition = and(
      eq(medicationCheckIns.patientId, patientId),
      gte(medicationCheckIns.takenAt, start),
      lte(medicationCheckIns.takenAt, end),
    );

    if (medicationId !== undefined) {
      condition = and(condition, eq(medicationCheckIns.medicationId, medicationId));
    }

    const checkIns = await buildBaseCheckInQuery()
      .where(condition)
      .orderBy(desc(medicationCheckIns.takenAt))
      .limit(limit);

    const summary = summarizeCheckIns(checkIns);

    res.json({
      patientId,
      medicationId: medicationId ?? null,
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
        days: rangeDays,
      },
      limit,
      summary,
      checkIns,
    });
  } catch (error) {
    console.error("Error fetching medication check-ins", error);
    res.status(500).json({ error: "Failed to load medication check-ins" });
  }
});

router.post("/", authenticate, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { medicationId, status, takenAt, scheduledFor, notes } = req.body as {
      medicationId?: number;
      status?: string;
      takenAt?: string;
      scheduledFor?: string;
      notes?: string;
    };

    if (!medicationId || Number.isNaN(Number(medicationId))) {
      return res.status(400).json({ error: "medicationId is required" });
    }

    const [medication] = await db
      .select({ id: medications.id, patientId: medications.patientId })
      .from(medications)
      .where(eq(medications.id, Number(medicationId)))
      .limit(1);

    if (!medication) {
      return res.status(404).json({ error: "Medication not found" });
    }

    const hasAccess = await hasPatientAccess(userId, medication.patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const normalizedStatus = normalizeStatus(status);
    if (!normalizedStatus) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    const takenAtDate = takenAt ? new Date(takenAt) : new Date();
    if (Number.isNaN(takenAtDate.getTime())) {
      return res.status(400).json({ error: "Invalid takenAt date" });
    }

    const scheduledForDate = scheduledFor ? new Date(scheduledFor) : null;
    if (scheduledFor && Number.isNaN(scheduledForDate?.getTime() ?? NaN)) {
      return res.status(400).json({ error: "Invalid scheduledFor date" });
    }

    const inserted = await db
      .insert(medicationCheckIns)
      .values({
        patientId: medication.patientId,
        medicationId: medication.id,
        status: normalizedStatus,
        scheduledFor: scheduledForDate,
        takenAt: takenAtDate,
        notes: notes?.trim() ? notes.trim() : null,
        recordedByUserId: userId,
      })
      .returning({ id: medicationCheckIns.id });

    const createdId = inserted[0]?.id;
    if (!createdId) {
      throw new Error("Failed to record medication check-in");
    }

    const [created] = await buildBaseCheckInQuery()
      .where(eq(medicationCheckIns.id, createdId))
      .limit(1);

    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating medication check-in", error);
    res.status(500).json({ error: "Failed to create medication check-in" });
  }
});

export default router;

type CheckInSummary = {
  total: number;
  taken: number;
  skipped: number;
  missed: number;
};

type CheckInQueryResult = Awaited<ReturnType<typeof buildBaseCheckInQuery>>;
type ApiCheckIn = CheckInQueryResult extends Array<infer Item> ? Item : never;

function summarizeCheckIns(checkIns: ApiCheckIn[]): CheckInSummary {
  return checkIns.reduce(
    (acc, checkIn) => {
      acc.total += 1;
      if (checkIn.status === "taken") acc.taken += 1;
      if (checkIn.status === "skipped") acc.skipped += 1;
      if (checkIn.status === "missed") acc.missed += 1;
      return acc;
    },
    { total: 0, taken: 0, skipped: 0, missed: 0 },
  );
}

function normalizeStatus(status?: string): MedicationCheckIn["status"] | null {
  if (!status) return "taken";
  const lowered = status.toLowerCase().trim();
  if (STATUSES.has(lowered as MedicationCheckIn["status"])) {
    return lowered as MedicationCheckIn["status"];
  }
  return null;
}

function buildBaseCheckInQuery() {
  return db
    .select({
      id: medicationCheckIns.id,
      patientId: medicationCheckIns.patientId,
      medicationId: medicationCheckIns.medicationId,
      medicationName: medications.name,
      medicationDosage: medications.dosage,
      status: medicationCheckIns.status,
      scheduledFor: medicationCheckIns.scheduledFor,
      takenAt: medicationCheckIns.takenAt,
      notes: medicationCheckIns.notes,
      recordedByUserId: medicationCheckIns.recordedByUserId,
      recordedByName: users.name,
    })
    .from(medicationCheckIns)
    .innerJoin(medications, eq(medications.id, medicationCheckIns.medicationId))
    .leftJoin(users, eq(users.id, medicationCheckIns.recordedByUserId));
}

function clampRangeDays(raw: number) {
  if (Number.isNaN(raw) || !Number.isFinite(raw)) return DEFAULT_RANGE_DAYS;
  return Math.min(Math.max(Math.floor(raw), 1), MAX_RANGE_DAYS);
}

function clampLimit(raw: number) {
  if (Number.isNaN(raw) || !Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(raw), 1), 500);
}
