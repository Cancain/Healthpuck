import admin from "firebase-admin";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

import { db } from "../db";
import { deviceTokens, notificationPreferences, patientUsers, alerts } from "../db/schema";

let firebaseApp: admin.app.App | null = null;

type AlertNotificationCache = Map<number, Date>;
const alertNotificationCache: AlertNotificationCache = new Map();
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;

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
      const filePath = path.isAbsolute(serviceAccountKey)
        ? serviceAccountKey
        : path.resolve(process.cwd(), serviceAccountKey);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        serviceAccount = JSON.parse(fileContent);
      } else {
        throw new Error(`Firebase service account file not found: ${filePath}`);
      }
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
            "content-available": 1,
          },
        },
      },
    };

    console.log(
      `[Notification Service] Sending FCM notification: title="${title}", body="${body}", channelId=alerts, platform=${message.android ? "android" : message.apns ? "ios" : "unknown"}`,
    );
    await admin.messaging().send(message);
    console.log(`[Notification Service] FCM notification sent successfully`);
    return true;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    if (
      firebaseError.code === "messaging/invalid-registration-token" ||
      firebaseError.code === "messaging/registration-token-not-registered"
    ) {
      console.log(`[Notification Service] Invalid token, removing: ${token.substring(0, 20)}...`);
      try {
        const [tokenRecord] = await db
          .select({ userId: deviceTokens.userId })
          .from(deviceTokens)
          .where(eq(deviceTokens.token, token))
          .limit(1);
        if (tokenRecord) {
          console.log(
            `[Notification Service] Token belongs to user ${tokenRecord.userId}, removing invalid token`,
          );
        }
        await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
      } catch (deleteError) {
        console.error("[Notification Service] Error removing invalid token:", deleteError);
      }
    } else {
      console.error("[Notification Service] Failed to send FCM notification:", error);
      console.error("[Notification Service] Error code:", firebaseError.code);
      console.error("[Notification Service] Error message:", firebaseError.message);
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
  const lastNotificationSent = alertNotificationCache.get(alertId);
  if (lastNotificationSent) {
    const timeSinceLastNotification = Date.now() - lastNotificationSent.getTime();
    if (timeSinceLastNotification < NOTIFICATION_COOLDOWN_MS) {
      const remainingMinutes = Math.ceil(
        (NOTIFICATION_COOLDOWN_MS - timeSinceLastNotification) / (60 * 1000),
      );
      console.log(
        `[Notification Service] Alert ${alertId} (${alertName}) rate limited - last notification sent ${Math.floor(timeSinceLastNotification / 1000)}s ago, waiting ${remainingMinutes} more minute(s)`,
      );
      return;
    }
  }

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
  const invalidTokens: string[] = [];

  for (const userId of recipients) {
    const shouldSend = await shouldSendNotification(userId, priority);
    if (!shouldSend) {
      console.log(
        `[Notification Service] Skipping user ${userId} - notifications disabled for priority ${priority}`,
      );
      continue;
    }

    const tokens = await getDeviceTokensForUser(userId);
    if (tokens.length === 0) {
      console.log(`[Notification Service] No device tokens found for user ${userId}`);
      continue;
    }

    console.log(`[Notification Service] Sending to user ${userId} (${tokens.length} token(s))`);

    for (const token of tokens) {
      const success = await sendFCMNotification(token, title, body, data);
      if (success) {
        successCount++;
      } else {
        failCount++;
        invalidTokens.push(token.substring(0, 20) + "...");
      }
    }
  }

  console.log(
    `[Notification Service] Alert ${alertId}: Sent ${successCount} notifications, ${failCount} failed`,
  );
  if (invalidTokens.length > 0) {
    console.log(`[Notification Service] Invalid tokens removed: ${invalidTokens.join(", ")}`);
  }

  if (successCount > 0) {
    alertNotificationCache.set(alertId, new Date());
    console.log(
      `[Notification Service] Alert ${alertId} notification sent, cooldown started (5 minutes)`,
    );
  }
}
