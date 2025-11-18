import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { alerts } from "../db/schema";
import { getUserIdFromRequest, authenticate, hasPatientAccess } from "../middleware/auth";
import { getPatientContextForUser } from "../utils/patientContext";
import { evaluateAllAlerts } from "../utils/alertEvaluator";

const router = Router();

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { patientId, name, metricType, metricPath, operator, thresholdValue, priority, enabled } =
      req.body;

    if (
      !patientId ||
      !name ||
      !metricType ||
      !metricPath ||
      !operator ||
      thresholdValue === undefined ||
      !priority
    ) {
      return res.status(400).json({
        error:
          "patientId, name, metricType, metricPath, operator, thresholdValue, and priority are required",
      });
    }

    if (!["whoop", "medication"].includes(metricType)) {
      return res.status(400).json({ error: "metricType must be 'whoop' or 'medication'" });
    }

    if (!["<", ">", "=", "<=", ">="].includes(operator)) {
      return res.status(400).json({ error: "operator must be one of: <, >, =, <=, >=" });
    }

    if (!["high", "mid", "low"].includes(priority)) {
      return res.status(400).json({ error: "priority must be one of: high, mid, low" });
    }

    const hasAccess = await hasPatientAccess(userId, patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this patient" });
    }

    const newAlert = await db
      .insert(alerts)
      .values({
        patientId,
        createdBy: userId,
        name,
        metricType,
        metricPath,
        operator,
        thresholdValue: String(thresholdValue),
        priority,
        enabled: enabled !== undefined ? enabled : true,
      })
      .returning();

    return res.status(201).json(newAlert[0]);
  } catch (error) {
    console.error("Error creating alert:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { patientId } = await getPatientContextForUser(userId);

    const result = await db.select().from(alerts).where(eq(alerts.patientId, patientId));

    return res.json(result);
  } catch (error: any) {
    if (error.message === "User is not associated with a patient") {
      return res.status(404).json({
        error: "Inga omsorgstagare hittades för ditt konto. Lägg till en patient först.",
        code: "NO_PATIENT",
      });
    }
    console.error("Error fetching alerts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const alertId = Number(req.params.id);

    const result = await db.select().from(alerts).where(eq(alerts.id, alertId)).limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: "Alert not found" });
    }

    const alert = result[0];

    const hasAccess = await hasPatientAccess(userId, alert.patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(alert);
  } catch (error) {
    console.error("Error fetching alert:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const alertId = Number(req.params.id);
    const { name, metricType, metricPath, operator, thresholdValue, priority, enabled } = req.body;

    const existing = await db.select().from(alerts).where(eq(alerts.id, alertId)).limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Alert not found" });
    }

    const alert = existing[0];

    const hasAccess = await hasPatientAccess(userId, alert.patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (metricType !== undefined) {
      if (!["whoop", "medication"].includes(metricType)) {
        return res.status(400).json({ error: "metricType must be 'whoop' or 'medication'" });
      }
      updateData.metricType = metricType;
    }
    if (metricPath !== undefined) updateData.metricPath = metricPath;
    if (operator !== undefined) {
      if (!["<", ">", "=", "<=", ">="].includes(operator)) {
        return res.status(400).json({ error: "operator must be one of: <, >, =, <=, >=" });
      }
      updateData.operator = operator;
    }
    if (thresholdValue !== undefined) updateData.thresholdValue = String(thresholdValue);
    if (priority !== undefined) {
      if (!["high", "mid", "low"].includes(priority)) {
        return res.status(400).json({ error: "priority must be one of: high, mid, low" });
      }
      updateData.priority = priority;
    }
    if (enabled !== undefined) updateData.enabled = enabled;

    const updated = await db
      .update(alerts)
      .set(updateData)
      .where(eq(alerts.id, alertId))
      .returning();

    return res.json(updated[0]);
  } catch (error) {
    console.error("Error updating alert:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const alertId = Number(req.params.id);

    const existing = await db.select().from(alerts).where(eq(alerts.id, alertId)).limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Alert not found" });
    }

    const alert = existing[0];

    const hasAccess = await hasPatientAccess(userId, alert.patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    await db.delete(alerts).where(eq(alerts.id, alertId));

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting alert:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/active", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { patientId } = await getPatientContextForUser(userId);

    const activeAlerts = await evaluateAllAlerts(patientId);

    return res.json(activeAlerts);
  } catch (error: any) {
    if (error.message === "User is not associated with a patient") {
      return res.status(404).json({
        error: "Inga omsorgstagare hittades för ditt konto. Lägg till en patient först.",
        code: "NO_PATIENT",
      });
    }
    console.error("Error fetching active alerts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
