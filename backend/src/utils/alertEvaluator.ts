import { eq, and } from "drizzle-orm";

import { db } from "../db";
import { alerts, medicationCheckIns } from "../db/schema";
import type { Alert } from "../db/schema";
import { ensureWhoopAccessTokenForPatient } from "./whoopSync";
import { WhoopClient } from "./whoopClient";

export type ActiveAlert = {
  alert: Alert;
  currentValue: number;
  isActive: boolean;
  triggeredAt?: Date;
};

const whoopClient = WhoopClient.create();

function getNestedValue(obj: any, path: string): number | null {
  const parts = path.split(".");
  let current: any = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }

    if (Array.isArray(current)) {
      if (current.length === 0) {
        return null;
      }
      current = current[0];
    }

    if (typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }

  if (typeof current === "number") {
    if (isNaN(current) || !isFinite(current)) {
      return null;
    }
    return current;
  }

  if (typeof current === "string") {
    const parsed = parseFloat(current);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return null;
    }
    return parsed;
  }

  return null;
}

async function evaluateWhoopMetric(
  alert: Alert,
  patientId: number,
): Promise<{ currentValue: number | null; error?: string }> {
  try {
    let accessToken: string;
    try {
      const tokenResult = await ensureWhoopAccessTokenForPatient(patientId);
      accessToken = tokenResult.accessToken;
    } catch (error: any) {
      if (error.message === "No Whoop connection found for patient") {
        return {
          currentValue: null,
          error: "No Whoop connection found for patient",
        };
      }
      throw error;
    }

    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    let metricValue: number | null = null;

    const metricPath = alert.metricPath.toLowerCase();

    if (metricPath === "heart_rate" || metricPath === "heartrate") {
      const cycles = await whoopClient.fetchCycles(accessToken, start, end);
      const cycleArray = Array.isArray(cycles)
        ? cycles
        : (cycles as any)?.records || (cycles as any)?.data || [];

      if (cycleArray.length > 0 && cycleArray[0].recovery) {
        const hr =
          cycleArray[0].recovery.score?.resting_heart_rate ||
          cycleArray[0].recovery.score?.heart_rate ||
          cycleArray[0].recovery.resting_heart_rate ||
          cycleArray[0].recovery.heart_rate;

        if (typeof hr === "number" && hr > 0 && isFinite(hr)) {
          metricValue = hr;
        }
      }

      if (metricValue === null) {
        const workouts = await whoopClient.fetchWorkouts(accessToken, start, end);
        const workoutArray = Array.isArray(workouts)
          ? workouts
          : (workouts as any)?.records || (workouts as any)?.data || [];

        for (const workout of workoutArray) {
          const hr =
            workout.score?.average_heart_rate ||
            workout.score?.max_heart_rate ||
            workout.score?.heart_rate ||
            workout.heart_rate ||
            workout.hr ||
            workout.average_heart_rate ||
            workout.avg_heart_rate ||
            workout.max_heart_rate ||
            workout.heartRate ||
            workout.averageHeartRate ||
            workout.maxHeartRate;

          if (typeof hr === "number" && hr > 0 && isFinite(hr)) {
            metricValue = hr;
            break;
          }
        }
      }
    } else if (metricPath.startsWith("recovery")) {
      const cycles = await whoopClient.fetchCycles(accessToken, start, end);
      const cycleArray = Array.isArray(cycles)
        ? cycles
        : (cycles as any)?.records || (cycles as any)?.data || [];

      if (cycleArray.length > 0 && cycleArray[0].recovery) {
        const pathToUse = alert.metricPath.replace(/^recovery\./, "");
        metricValue = getNestedValue(cycleArray[0].recovery, pathToUse) || null;
      }

      if (metricValue === null) {
        const recovery = await whoopClient.fetchRecovery(accessToken, start, end);
        const recoveryArray = Array.isArray(recovery)
          ? recovery
          : (recovery as any)?.records || (recovery as any)?.data || [];

        if (recoveryArray.length > 0) {
          const pathToUse = alert.metricPath.replace(/^recovery\./, "");
          metricValue = getNestedValue(recoveryArray[0], pathToUse) || null;
        }
      }
    } else if (metricPath.startsWith("sleep")) {
      const sleep = await whoopClient.fetchSleep(accessToken, start, end);
      const sleepArray = Array.isArray(sleep)
        ? sleep
        : (sleep as any)?.records || (sleep as any)?.data || [];

      if (sleepArray.length > 0) {
        metricValue = getNestedValue(sleepArray[0], alert.metricPath) || null;
      }
    } else {
      const cycles = await whoopClient.fetchCycles(accessToken, start, end);
      const cycleArray = Array.isArray(cycles)
        ? cycles
        : (cycles as any)?.records || (cycles as any)?.data || [];

      if (cycleArray.length > 0) {
        metricValue = getNestedValue(cycleArray[0], alert.metricPath) || null;
      }

      if (metricValue === null) {
        const recovery = await whoopClient.fetchRecovery(accessToken, start, end);
        const recoveryArray = Array.isArray(recovery)
          ? recovery
          : (recovery as any)?.records || (recovery as any)?.data || [];

        if (recoveryArray.length > 0) {
          metricValue = getNestedValue(recoveryArray[0], alert.metricPath) || null;
        }
      }
    }

    return { currentValue: metricValue };
  } catch (error: any) {
    console.error(`Error evaluating Whoop metric for alert ${alert.id}:`, error);
    return {
      currentValue: null,
      error: error?.message || "Failed to fetch Whoop metric",
    };
  }
}

async function evaluateMedicationMetric(
  alert: Alert,
  patientId: number,
): Promise<{ currentValue: number | null; error?: string }> {
  try {
    if (alert.metricPath === "missed_dose") {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const missedCheckIns = await db
        .select()
        .from(medicationCheckIns)
        .where(
          and(eq(medicationCheckIns.patientId, patientId), eq(medicationCheckIns.status, "missed")),
        );

      const recentMissed = missedCheckIns.filter(
        (checkIn) => checkIn.takenAt && checkIn.takenAt.getTime() >= twentyFourHoursAgo.getTime(),
      );

      return { currentValue: recentMissed.length };
    }

    return { currentValue: null, error: `Unknown medication metric: ${alert.metricPath}` };
  } catch (error: any) {
    console.error(`Error evaluating medication metric for alert ${alert.id}:`, error);
    return {
      currentValue: null,
      error: error?.message || "Failed to fetch medication metric",
    };
  }
}

function compareValues(
  currentValue: number | null,
  operator: string,
  thresholdValue: string,
): boolean {
  if (currentValue === null || !isFinite(currentValue)) {
    return false;
  }

  const threshold = parseFloat(thresholdValue);
  if (isNaN(threshold) || !isFinite(threshold)) {
    return false;
  }

  switch (operator) {
    case "<":
      return currentValue < threshold;
    case ">":
      return currentValue > threshold;
    case "=":
      return Math.abs(currentValue - threshold) < 0.0001;
    case "<=":
      return currentValue <= threshold;
    case ">=":
      return currentValue >= threshold;
    default:
      return false;
  }
}

export async function evaluateAlert(alert: Alert, patientId: number): Promise<ActiveAlert> {
  let currentValue: number | null = null;

  if (alert.metricType === "whoop") {
    const result = await evaluateWhoopMetric(alert, patientId);
    currentValue = result.currentValue;
  } else if (alert.metricType === "medication") {
    const result = await evaluateMedicationMetric(alert, patientId);
    currentValue = result.currentValue;
  }

  if (currentValue !== null && (!isFinite(currentValue) || isNaN(currentValue))) {
    currentValue = null;
  }

  const isActive =
    currentValue !== null && compareValues(currentValue, alert.operator, alert.thresholdValue);

  return {
    alert,
    currentValue: currentValue ?? 0,
    isActive,
  };
}

export async function evaluateAllAlerts(patientId: number): Promise<ActiveAlert[]> {
  try {
    const enabledAlerts = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.patientId, patientId), eq(alerts.enabled, true)));

    const results = await Promise.all(
      enabledAlerts.map((alert) =>
        evaluateAlert(alert, patientId).catch((error) => {
          console.error(`Error evaluating alert ${alert.id}:`, error);
          return {
            alert,
            currentValue: 0,
            isActive: false,
          };
        }),
      ),
    );

    return results.filter((result) => result.isActive);
  } catch (error) {
    console.error(`Error in evaluateAllAlerts for patient ${patientId}:`, error);
    throw error;
  }
}
