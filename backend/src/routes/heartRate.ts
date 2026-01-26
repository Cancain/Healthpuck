import { Router, Request, Response } from "express";
import { desc, eq } from "drizzle-orm";

import { authenticate, getUserIdFromRequest } from "../middleware/auth";
import { getPatientContextForUser, assertUserHasAccessToPatient } from "../utils/patientContext";
import { db } from "../db";
import { heartRateReadings, whoopConnections, patientUsers, patients } from "../db/schema";
import { whoopRateLimiter } from "../utils/whoopRateLimiter";
import { broadcastHeartRateToCaregivers } from "../websocket/server";
import { ensureWhoopAccessTokenForPatient } from "../utils/whoopSync";
import { WhoopClient } from "../utils/whoopClient";

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

    console.log(
      `[Heart Rate POST] Heart rate ${heartRate} bpm saved and cached for patient ${context.patientId}`,
    );

    broadcastHeartRateToCaregivers(context.patientId, heartRate, timestamp.getTime());

    try {
      const { evaluateAllAlerts } = await import("../utils/alertEvaluator");
      const { getActiveAlertsForPatient } = await import("../utils/alertScheduler");
      const { sendAlertNotification } = await import("../utils/notificationService");

      const previousActiveIds = new Set(getActiveAlertsForPatient(context.patientId));

      const activeAlerts = await evaluateAllAlerts(context.patientId);

      console.log(
        `[Heart Rate POST] Evaluated alerts: ${activeAlerts.length} active, previous: ${previousActiveIds.size}`,
      );

      for (const activeAlert of activeAlerts) {
        const alert = activeAlert.alert;
        const isNewlyTriggered = !previousActiveIds.has(alert.id);

        console.log(
          `[Heart Rate POST] Alert ${alert.id} (${alert.name}): currentValue=${activeAlert.currentValue}, isActive=${activeAlert.isActive}, newlyTriggered=${isNewlyTriggered}`,
        );

        if (isNewlyTriggered) {
          console.log(
            `[Heart Rate POST] Newly triggered alert ${alert.id} (${alert.name}), sending notification`,
          );
          await sendAlertNotification(alert.id, context.patientId, alert.name, alert.priority);
        }
      }
    } catch (error) {
      console.error("[Heart Rate POST] Error evaluating alerts after upload:", error);
    }

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

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const requestedPatientId = req.query.patientId ? Number(req.query.patientId) : null;

    let context: { patientId: number; patientName: string; role: string };
    if (requestedPatientId) {
      await assertUserHasAccessToPatient(userId, requestedPatientId);
      const allAssociations = await db
        .select({
          patientId: patientUsers.patientId,
          patientName: patients.name,
          role: patientUsers.role,
        })
        .from(patientUsers)
        .innerJoin(patients, eq(patientUsers.patientId, patients.id))
        .where(eq(patientUsers.userId, userId));
      const requested = allAssociations.find((a) => a.patientId === requestedPatientId);
      if (!requested) {
        return res.status(403).json({ error: "User does not have access to this patient" });
      }
      context = requested;
    } else {
      context = await getPatientContextForUser(userId);
    }
    console.log(
      `[Heart Rate GET] userId=${userId}, patientId=${context.patientId}, role=${context.role}, requestedPatientId=${requestedPatientId}`,
    );

    const [latestReading] = await db
      .select()
      .from(heartRateReadings)
      .where(eq(heartRateReadings.patientId, context.patientId))
      .orderBy(desc(heartRateReadings.timestamp))
      .limit(1);

    console.log(
      `[Heart Rate GET] Database query result:`,
      latestReading
        ? `found reading with heartRate=${latestReading.heartRate}, source=${latestReading.source}, timestamp=${latestReading.timestamp.getTime()}`
        : "no reading found",
    );

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (latestReading && latestReading.timestamp >= fiveMinutesAgo) {
      const heartRate = latestReading.heartRate;
      const timestamp = latestReading.timestamp.getTime();

      whoopRateLimiter.cacheHeartRate(context.patientId, heartRate);

      console.log(
        `[Heart Rate GET] Returning recent database reading (${latestReading.source}): ${heartRate}`,
      );
      return res.json({
        heartRate,
        cached: false,
        rateLimited: false,
        timestamp,
      });
    }

    const [whoopConnection] = await db
      .select()
      .from(whoopConnections)
      .where(eq(whoopConnections.patientId, context.patientId))
      .limit(1);

    if (whoopConnection) {
      try {
        const { accessToken } = await ensureWhoopAccessTokenForPatient(context.patientId);
        const whoopClient = WhoopClient.create();
        const end = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

        const workouts = await whoopClient.fetchWorkouts(accessToken, start, end);
        const workoutArray = Array.isArray(workouts)
          ? workouts
          : (workouts as any)?.records || (workouts as any)?.data || [];

        let heartRate: number | null = null;

        for (const workout of workoutArray) {
          const hr =
            workout.heartRate ||
            workout.averageHeartRate ||
            workout.maxHeartRate ||
            workout.metrics?.heart_rate ||
            workout.metrics?.average_heart_rate ||
            workout.score?.metrics?.heart_rate;

          if (typeof hr === "number" && hr > 0) {
            heartRate = hr;
            break;
          }
        }

        if (heartRate === null) {
          const recovery = await whoopClient.fetchRecovery(accessToken, start, end);
          const recoveryArray = Array.isArray(recovery)
            ? recovery
            : (recovery as any)?.records || (recovery as any)?.data || [];

          for (const rec of recoveryArray) {
            const hr =
              rec.score?.resting_heart_rate ||
              rec.score?.heart_rate ||
              rec.resting_heart_rate ||
              rec.heart_rate;

            if (typeof hr === "number" && hr > 0) {
              heartRate = hr;
              break;
            }
          }
        }

        if (heartRate !== null) {
          whoopRateLimiter.cacheHeartRate(context.patientId, heartRate);
          console.log(`[Heart Rate GET] Returning fresh Whoop data: ${heartRate}`);
          return res.json({
            heartRate,
            cached: false,
            rateLimited: false,
            timestamp: Date.now(),
          });
        } else {
          console.log(`[Heart Rate GET] Whoop API returned no heart rate data`);
        }
      } catch (error) {
        console.error("[Heart Rate] Error fetching from Whoop:", error);
      }
    }

    if (latestReading) {
      const heartRate = latestReading.heartRate;
      const timestamp = latestReading.timestamp.getTime();

      whoopRateLimiter.cacheHeartRate(context.patientId, heartRate);

      console.log(`[Heart Rate GET] Returning older database reading: ${heartRate}`);
      return res.json({
        heartRate,
        cached: false,
        rateLimited: false,
        timestamp,
      });
    }

    const cached = whoopRateLimiter.getCachedHeartRate(context.patientId);
    if (cached && cached.heartRate !== null) {
      console.log(`[Heart Rate GET] Returning cached heart rate: ${cached.heartRate}`);
      return res.json({
        heartRate: cached.heartRate,
        cached: true,
        rateLimited: false,
        timestamp: cached.timestamp,
      });
    }

    return res.json({
      heartRate: null,
      cached: false,
      rateLimited: false,
    });
  } catch (error) {
    console.error("Error fetching heart rate:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
