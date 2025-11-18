import { eq, and } from "drizzle-orm";

import { db } from "../db";
import { alerts } from "../db/schema";
import { evaluateAllAlerts } from "./alertEvaluator";

type ActiveAlertsCache = Map<number, Array<{ alertId: number; triggeredAt: Date }>>;

const activeAlertsCache: ActiveAlertsCache = new Map();

const PRIORITY_INTERVALS = {
  high: 30 * 1000,
  mid: 5 * 60 * 1000,
  low: 24 * 60 * 60 * 1000,
};

let schedulerRunning = false;
const intervals: Map<string, NodeJS.Timeout> = new Map();

function getNextLowPriorityRunTime(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getTime() - now.getTime();
}

async function evaluateAlertsByPriority(priority: "high" | "mid" | "low") {
  try {
    const enabledAlerts = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.enabled, true), eq(alerts.priority, priority)));

    for (const alert of enabledAlerts) {
      try {
        const activeAlerts = await evaluateAllAlerts(alert.patientId);
        const activeAlertIds = new Set(
          activeAlerts.map((a) => a.alert.id).filter((id) => id === alert.id),
        );

        const cacheKey = alert.patientId;
        const previousActive = activeAlertsCache.get(cacheKey) || [];
        const previousActiveIds = new Set(previousActive.map((a) => a.alertId));

        const newlyTriggered = activeAlertIds.size > 0 && !previousActiveIds.has(alert.id);

        if (newlyTriggered) {
          console.log(
            `[Alert Scheduler] Alert ${alert.id} (${alert.name}) triggered for patient ${alert.patientId}`,
          );
        }

        const currentActive = Array.from(activeAlertIds).map((alertId) => ({
          alertId,
          triggeredAt: new Date(),
        }));

        if (currentActive.length > 0) {
          activeAlertsCache.set(cacheKey, currentActive);
        } else {
          activeAlertsCache.delete(cacheKey);
        }
      } catch (error) {
        console.error(`[Alert Scheduler] Error evaluating alert ${alert.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`[Alert Scheduler] Error evaluating ${priority} priority alerts:`, error);
  }
}

export function startAlertScheduler() {
  if (schedulerRunning) {
    console.log("[Alert Scheduler] Scheduler is already running");
    return;
  }

  console.log("[Alert Scheduler] Starting alert scheduler");

  const highInterval = setInterval(() => {
    evaluateAlertsByPriority("high");
  }, PRIORITY_INTERVALS.high);

  const midInterval = setInterval(() => {
    evaluateAlertsByPriority("mid");
  }, PRIORITY_INTERVALS.mid);

  const scheduleLowPriority = () => {
    const timeout = setTimeout(() => {
      evaluateAlertsByPriority("low");
      scheduleLowPriority();
    }, getNextLowPriorityRunTime());

    intervals.set("low", timeout);
  };

  scheduleLowPriority();

  intervals.set("high", highInterval);
  intervals.set("mid", midInterval);

  schedulerRunning = true;

  evaluateAlertsByPriority("high");
  evaluateAlertsByPriority("mid");
  evaluateAlertsByPriority("low");

  console.log(
    `[Alert Scheduler] Scheduler started - High: ${PRIORITY_INTERVALS.high / 1000}s, Mid: ${PRIORITY_INTERVALS.mid / 1000 / 60}min, Low: daily`,
  );
}

export function stopAlertScheduler() {
  if (!schedulerRunning) {
    return;
  }

  console.log("[Alert Scheduler] Stopping alert scheduler");

  intervals.forEach((interval) => {
    clearInterval(interval);
  });
  intervals.clear();

  schedulerRunning = false;
}

export function getActiveAlertsForPatient(patientId: number): number[] {
  const cached = activeAlertsCache.get(patientId);
  return cached ? cached.map((a) => a.alertId) : [];
}
