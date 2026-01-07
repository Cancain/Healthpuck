import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";

import { authenticate, getUserIdFromRequest } from "../middleware/auth";
import { db } from "../db";
import { deviceTokens, notificationPreferences } from "../db/schema";

const router = Router();

router.post("/register", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { token, platform } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!platform || !["ios", "android"].includes(platform)) {
      return res.status(400).json({ error: "Platform must be 'ios' or 'android'" });
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

    await db.insert(deviceTokens).values({
      userId,
      token,
      platform,
    });

    res.json({ success: true, message: "Token registered" });
  } catch (error) {
    console.error("Error registering device token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/unregister", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token is required" });
    }

    await db.delete(deviceTokens).where(eq(deviceTokens.token, token));

    res.json({ success: true, message: "Token unregistered" });
  } catch (error) {
    console.error("Error unregistering device token:", error);
    res.status(500).json({ error: "Internal server error" });
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

export default router;
