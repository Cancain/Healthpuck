import { Router, Request, Response } from "express";

import { authenticate, getUserIdFromRequest } from "../middleware/auth";
import { getPatientContextForUser } from "../utils/patientContext";
import { db } from "../db";
import { heartRateReadings } from "../db/schema";
import { whoopRateLimiter } from "../utils/whoopRateLimiter";
import { broadcastHeartRateToCaregivers } from "../websocket/server";

const router = Router();

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const context = await getPatientContextForUser(userId);
    if (context.role !== "patient") {
      return res.status(403).json({ error: "Only patients can send heart rate readings" });
    }

    const { heartRate, source } = req.body;

    if (typeof heartRate !== "number" || heartRate <= 0 || heartRate > 300) {
      return res.status(400).json({ error: "Invalid heart rate value" });
    }

    if (source !== "bluetooth" && source !== "api") {
      return res.status(400).json({ error: "Invalid source. Must be 'bluetooth' or 'api'" });
    }

    const timestamp = new Date();

    await db.insert(heartRateReadings).values({
      patientId: context.patientId,
      heartRate,
      source,
      timestamp,
    });

    whoopRateLimiter.cacheHeartRate(context.patientId, heartRate);

    broadcastHeartRateToCaregivers(context.patientId, heartRate, timestamp.getTime());

    res.json({
      success: true,
      heartRate,
      timestamp: timestamp.getTime(),
    });
  } catch (error) {
    console.error("Error saving heart rate:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
