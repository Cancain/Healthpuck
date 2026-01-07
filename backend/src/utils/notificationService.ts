import * as admin from "firebase-admin";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { deviceTokens, notificationPreferences, patientUsers, alerts } from "../db/schema";

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn(
      "[Notification Service] FIREBASE_SERVICE_ACCOUNT_KEY not set, push notifications disabled",
    );
    return null;
  }

  try {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch {
      serviceAccount = require(serviceAccountKey);
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("[Notification Service] Firebase initialized successfully");
    return firebaseApp;
  } catch (error) {
    console.error("[Notification Service] Failed to initialize Firebase:", error);
    return null;
  }
}

export async function getNotificationRecipients(patientId: number): Promise<number[]> {
  const associations = await db
    .select({ userId: patientUsers.userId })
    .from(patientUsers)
    .where(eq(patientUsers.patientId, patientId));

  return associations.map((a) => a.userId);
}

export async function shouldSendNotification(
  userId: number,
  priority: "high" | "mid" | "low",
): Promise<boolean> {
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (!prefs) {
    return true;
  }

  if (!prefs.alertsEnabled) {
    return false;
  }

  switch (priority) {
    case "high":
      return prefs.highPriorityEnabled;
    case "mid":
      return prefs.midPriorityEnabled;
    case "low":
      return prefs.lowPriorityEnabled;
    default:
      return false;
  }
}

export async function getDeviceTokensForUser(userId: number): Promise<string[]> {
  const tokens = await db
    .select({ token: deviceTokens.token })
    .from(deviceTokens)
    .where(eq(deviceTokens.userId, userId));

  return tokens.map((t) => t.token);
}

export async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> {
  if (!firebaseApp) {
    const app = initializeFirebase();
    if (!app) {
      console.error("[Notification Service] Firebase not initialized");
      return false;
    }
  }

  try {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: "high" as const,
        notification: {
          channelId: "alerts",
          sound: "default",
          priority: "high" as const,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    await admin.messaging().send(message);
    return true;
  } catch (error: any) {
    if (
      error.code === "messaging/invalid-registration-token" ||
      error.code === "messaging/registration-token-not-registered"
    ) {
      console.log(`[Notification Service] Invalid token, removing: ${token.substring(0, 20)}...`);
      await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
    } else {
      console.error("[Notification Service] Failed to send FCM notification:", error);
    }
    return false;
  }
}

export async function sendAlertNotification(
  alertId: number,
  patientId: number,
  alertName: string,
  priority: "high" | "mid" | "low",
): Promise<void> {
  const [alert] = await db.select().from(alerts).where(eq(alerts.id, alertId)).limit(1);

  if (!alert) {
    console.error(`[Notification Service] Alert ${alertId} not found`);
    return;
  }

  const recipients = await getNotificationRecipients(patientId);
  if (recipients.length === 0) {
    console.log(`[Notification Service] No recipients found for patient ${patientId}`);
    return;
  }

  const priorityLabels = {
    high: "Hög prioritet",
    mid: "Medel prioritet",
    low: "Låg prioritet",
  };

  const title = `Varning: ${alertName}`;
  const body = `${priorityLabels[priority]} - Varningen har aktiverats`;

  const data = {
    type: "alert",
    alertId: String(alertId),
    patientId: String(patientId),
    priority,
  };

  let successCount = 0;
  let failCount = 0;

  for (const userId of recipients) {
    const shouldSend = await shouldSendNotification(userId, priority);
    if (!shouldSend) {
      continue;
    }

    const tokens = await getDeviceTokensForUser(userId);
    if (tokens.length === 0) {
      continue;
    }

    for (const token of tokens) {
      const success = await sendFCMNotification(token, title, body, data);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  console.log(
    `[Notification Service] Sent ${successCount} notifications, ${failCount} failed for alert ${alertId}`,
  );
}
