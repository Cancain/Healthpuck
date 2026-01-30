import { Router, Request, Response } from "express";
import { eq, sql } from "drizzle-orm";

import { authenticate, getUserIdFromRequest } from "../middleware/auth";
import { db } from "../db";
import { deviceTokens, notificationPreferences, users } from "../db/schema";
import { sendFCMNotification, getDeviceTokensForUser } from "../utils/notificationService";

const router = Router();

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.all(
      sql`SELECT name FROM sqlite_master WHERE type='table' AND name=${tableName}`,
    );
    return result.length > 0;
  } catch {
    return false;
  }
}

router.post("/register", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const tableExists = await checkTableExists("device_tokens");
    if (!tableExists) {
      console.error("device_tokens table does not exist. Run migrations.");
      return res.status(500).json({ error: "Database not initialized. Please run migrations." });
    }

    const { token, platform } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!platform || !["ios", "android"].includes(platform)) {
      return res.status(400).json({ error: "Platform must be 'ios' or 'android'" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const existing = await db
      .select()
      .from(deviceTokens)
      .where(eq(deviceTokens.token, token))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(deviceTokens)
        .set({
          userId,
          platform,
          updatedAt: new Date(),
        })
        .where(eq(deviceTokens.token, token));

      return res.json({ success: true, message: "Token updated" });
    }

    try {
      await db
        .insert(deviceTokens)
        .values({
          userId,
          token,
          platform,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      res.json({ success: true, message: "Token registered" });
    } catch (insertError: any) {
      const errorMessage = insertError?.message || String(insertError);
      const errorCode = insertError?.code;
      
      if (
        errorCode === 19 ||
        errorMessage.includes("UNIQUE constraint") ||
        errorMessage.includes("unique constraint") ||
        errorMessage.includes("FOREIGN KEY constraint") ||
        errorMessage.includes("Failed query")
      ) {
        if (errorMessage.includes("FOREIGN KEY constraint")) {
          console.error("Foreign key constraint failed. User ID:", userId);
          return res.status(400).json({ 
            error: "Invalid user ID",
            message: "The user ID does not exist in the database" 
          });
        }
        if (errorMessage.includes("Failed query") && errorMessage.includes('"id"')) {
          try {
            const now = Math.floor(Date.now() / 1000);
            await db.run(
              sql`INSERT INTO device_tokens (user_id, token, platform, created_at, updated_at) VALUES (${userId}, ${token}, ${platform}, ${now}, ${now})`,
            );
            return res.json({ success: true, message: "Token registered" });
          } catch (rawInsertError: any) {
            const rawErrorMessage = rawInsertError?.message || String(rawInsertError);
            if (rawErrorMessage.includes("FOREIGN KEY constraint")) {
              console.error("Foreign key constraint failed in raw insert. User ID:", userId);
              return res.status(400).json({ 
                error: "Invalid user ID",
                message: "The user ID does not exist in the database" 
              });
            }
            if (
              rawInsertError?.code === 19 ||
              rawErrorMessage.includes("UNIQUE constraint") ||
              rawErrorMessage.includes("unique constraint")
            ) {
              await db
                .update(deviceTokens)
                .set({
                  userId,
                  platform,
                  updatedAt: new Date(),
                })
                .where(eq(deviceTokens.token, token));
              return res.json({ success: true, message: "Token updated" });
            }
            throw rawInsertError;
          }
        } else {
          try {
            await db
              .update(deviceTokens)
              .set({
                userId,
                platform,
                updatedAt: new Date(),
              })
              .where(eq(deviceTokens.token, token));
            return res.json({ success: true, message: "Token updated" });
          } catch (updateError: any) {
            console.error("Error updating device token:", updateError);
            throw insertError;
          }
        }
      }
      throw insertError;
    }
  } catch (error: any) {
    console.error("Error registering device token:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    const errorMessage =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error?.message || "Internal server error";
    res.status(500).json({ error: errorMessage });
  }
});

router.delete("/unregister", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const tableExists = await checkTableExists("device_tokens");
    if (!tableExists) {
      console.error("device_tokens table does not exist. Run migrations.");
      return res.status(500).json({ error: "Database not initialized. Please run migrations." });
    }

    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token is required" });
    }

    await db.delete(deviceTokens).where(eq(deviceTokens.token, token));

    res.json({ success: true, message: "Token unregistered" });
  } catch (error: any) {
    console.error("Error unregistering device token:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    const errorMessage =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error?.message || "Internal server error";
    res.status(500).json({ error: errorMessage });
  }
});

router.get("/preferences", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (!prefs) {
      const defaultPrefs = {
        userId,
        alertsEnabled: true,
        highPriorityEnabled: true,
        midPriorityEnabled: true,
        lowPriorityEnabled: true,
      };

      const [newPrefs] = await db.insert(notificationPreferences).values(defaultPrefs).returning();

      return res.json(newPrefs);
    }

    res.json(prefs);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/preferences", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { alertsEnabled, highPriorityEnabled, midPriorityEnabled, lowPriorityEnabled } = req.body;

    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (typeof alertsEnabled === "boolean") {
      updateData.alertsEnabled = alertsEnabled;
    }
    if (typeof highPriorityEnabled === "boolean") {
      updateData.highPriorityEnabled = highPriorityEnabled;
    }
    if (typeof midPriorityEnabled === "boolean") {
      updateData.midPriorityEnabled = midPriorityEnabled;
    }
    if (typeof lowPriorityEnabled === "boolean") {
      updateData.lowPriorityEnabled = lowPriorityEnabled;
    }

    if (existing) {
      const [updated] = await db
        .update(notificationPreferences)
        .set(updateData)
        .where(eq(notificationPreferences.userId, userId))
        .returning();

      return res.json(updated);
    } else {
      const defaultPrefs = {
        userId,
        alertsEnabled: alertsEnabled !== undefined ? alertsEnabled : true,
        highPriorityEnabled: highPriorityEnabled !== undefined ? highPriorityEnabled : true,
        midPriorityEnabled: midPriorityEnabled !== undefined ? midPriorityEnabled : true,
        lowPriorityEnabled: lowPriorityEnabled !== undefined ? lowPriorityEnabled : true,
        ...updateData,
      };

      const [newPrefs] = await db.insert(notificationPreferences).values(defaultPrefs).returning();

      return res.json(newPrefs);
    }
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/test", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      return res.status(503).json({
        error: "Firebase not configured",
        message:
          "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please configure Firebase Admin SDK to enable push notifications. See FIREBASE_SETUP_GUIDE.md for instructions.",
      });
    }

    const tokens = await getDeviceTokensForUser(userId);
    if (tokens.length === 0) {
      return res.status(400).json({ error: "No device tokens registered for this user" });
    }

    const { delay } = req.body;
    const delayMs = delay && typeof delay === "number" && delay > 0 ? delay * 1000 : 0;

    const sendNotification = async () => {
      const title = "Test Notification";
      const body =
        delayMs > 0
          ? `This is a scheduled test notification (sent after ${delayMs / 1000}s)`
          : "This is a test notification from Healthpuck";
      const data = {
        type: "test",
        timestamp: new Date().toISOString(),
      };

      let successCount = 0;
      let failCount = 0;

      for (const token of tokens) {
        const success = await sendFCMNotification(token, title, body, data);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      return { successCount, failCount };
    };

    if (delayMs > 0) {
      setTimeout(async () => {
        await sendNotification();
      }, delayMs);

      res.json({
        success: true,
        message: `Test notification scheduled to send in ${delayMs / 1000} seconds`,
        scheduled: true,
        delaySeconds: delayMs / 1000,
      });
    } else {
      const { successCount, failCount } = await sendNotification();
      res.json({
        success: true,
        message: `Test notification sent to ${successCount} device(s), ${failCount} failed`,
        sent: successCount,
        failed: failCount,
      });
    }
  } catch (error: any) {
    console.error("Error sending test notification:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

export default router;
