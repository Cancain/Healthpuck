import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { eq } from "drizzle-orm";

import authenticate, { getUserIdFromRequest } from "../../middleware/auth";
import { db } from "../../db";
import { whoopConnections } from "../../db/schema";
import { WhoopClient } from "../../utils/whoopClient";
import { ensureWhoopAccessTokenForPatient } from "../../utils/whoopSync";
import { serializeState, parseAndValidateState } from "../../utils/whoopState";
import { getPatientContextForUser, assertUserHasAccessToPatient } from "../../utils/patientContext";
import { whoopRateLimiter } from "../../utils/whoopRateLimiter";

const router = Router();
const whoopClient = WhoopClient.create();
const scopeList = (
  process.env.WHOOP_SCOPE ??
  "offline read:profile read:recovery read:cycles read:sleep read:workout read:body_measurement"
)
  .split(/\s+/)
  .map((s) => s.trim())
  .filter(Boolean);
const frontendBase =
  process.env.WHOOP_APP_BASE_URL ||
  process.env.CORS_ORIGIN?.split(",")[0]?.trim() ||
  "http://localhost:3000";
const SUCCESS_REDIRECT_URL =
  process.env.WHOOP_CONNECT_REDIRECT_SUCCESS ||
  `${removeTrailingSlash(frontendBase)}/settings?tab=whoop`;
const ERROR_REDIRECT_URL =
  process.env.WHOOP_CONNECT_REDIRECT_ERROR ||
  `${removeTrailingSlash(frontendBase)}/settings?tab=whoop`;

router.get("/connect-url", authenticate, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { patientId } = await getPatientContextForUser(userId);
    const state = serializeState({ userId, patientId });

    const oauthBase = (
      process.env.WHOOP_OAUTH_BASE_URL || "https://api.prod.whoop.com/oauth/oauth2"
    ).replace(/\/$/, "");
    const clientId = process.env.WHOOP_CLIENT_ID;
    const callbackURL = process.env.WHOOP_REDIRECT_URI;

    if (!clientId || !callbackURL) {
      return res.status(500).json({ error: "Whoop OAuth not configured" });
    }

    const authorizeUrl = new URL(`${oauthBase}/auth`);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", callbackURL);
    authorizeUrl.searchParams.set("scope", scopeList.join(" "));
    authorizeUrl.searchParams.set("state", state);

    return res.json({ url: authorizeUrl.toString() });
  } catch (error) {
    console.error("Unable to determine patient for Whoop connect", error);
    return res.status(500).json({ error: "Unable to determine patient context" });
  }
});

router.get("/connect", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    const redirectUrl = buildRedirect(ERROR_REDIRECT_URL, {
      whoop: "error",
      whoop_error: "Not authenticated",
    });
    return res.redirect(303, redirectUrl);
  }

  try {
    const { patientId } = await getPatientContextForUser(userId);
    const state = serializeState({ userId, patientId });
    passport.authenticate("whoop", { scope: scopeList, state, session: false })(req, res, next);
  } catch (error) {
    console.error("Unable to determine patient for Whoop connect", error);
    const redirectUrl = buildRedirect(ERROR_REDIRECT_URL, {
      whoop: "error",
      whoop_error: "Unable to determine patient context",
    });
    return res.redirect(303, redirectUrl);
  }
});

router.get(
  "/callback",
  async (req: Request, res: Response, next: NextFunction) => {
    const stateParam = req.query.state as string | undefined;
    if (!stateParam) {
      const redirectUrl = buildRedirect(ERROR_REDIRECT_URL, {
        whoop: "error",
        whoop_error: "Missing state parameter",
      });
      return res.redirect(303, redirectUrl);
    }

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      const redirectUrl = buildRedirect(ERROR_REDIRECT_URL, {
        whoop: "error",
        whoop_error: "Not authenticated",
      });
      return res.redirect(303, redirectUrl);
    }

    try {
      const parsedState = parseAndValidateState(stateParam);
      if (parsedState.userId !== userId) {
        throw new Error("OAuth state user mismatch");
      }

      await assertUserHasAccessToPatient(userId, parsedState.patientId);
      req.whoopState = { ...parsedState, userId };
      next();
    } catch (error) {
      console.error("Invalid Whoop state", error);
      const redirectUrl = buildRedirect(ERROR_REDIRECT_URL, {
        whoop: "error",
        whoop_error:
          error instanceof Error
            ? error.message.slice(0, 250)
            : String(error ?? "Invalid state").slice(0, 250),
      });
      return res.redirect(303, redirectUrl);
    }
  },
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("whoop", { session: false }, (err: any, _user: any, info: any) => {
      if (err) {
        console.error("Whoop callback error", err);
        const redirectUrl = buildRedirect(ERROR_REDIRECT_URL, {
          whoop: "error",
          whoop_error:
            err instanceof Error
              ? err.message.slice(0, 250)
              : String(err ?? "Unknown error").slice(0, 250),
        });
        return res.redirect(303, redirectUrl);
      }

      const redirectUrl = buildRedirect(SUCCESS_REDIRECT_URL, {
        whoop: "connected",
        whoopUserId: info?.whoopUserId ? String(info.whoopUserId) : undefined,
        patientId: info?.patientId ? String(info.patientId) : undefined,
      });
      return res.redirect(303, redirectUrl);
    })(req, res, next);
  },
);

router.get("/status", authenticate, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { patientId, patientName } = await getPatientContextForUser(userId);
    const [connection] = await db
      .select()
      .from(whoopConnections)
      .where(eq(whoopConnections.patientId, patientId))
      .limit(1);

    if (!connection) {
      return res.json({ connected: false, patientId, patientName });
    }

    res.json({
      connected: true,
      patientId,
      patientName,
      whoopUserId: connection.whoopUserId,
      scope: connection.scope,
      expiresAt: connection.expiresAt,
      lastSyncedAt: connection.lastSyncedAt,
    });
  } catch (error) {
    console.error("Whoop status error", error);
    if (isMissingPatientContextError(error)) {
      return res.status(404).json({
        error: "Inga omsorgstagare hittades för ditt konto. Lägg till en patient först.",
        code: "NO_PATIENT",
      });
    }
    res.status(500).json({ error: "Failed to load Whoop status" });
  }
});

router.get("/metrics", authenticate, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { patientId, patientName } = await getPatientContextForUser(userId);
    const rangeDays = clampRange(Number(req.query.range ?? 7));
    const end = new Date();
    const start = new Date(end.getTime() - rangeDays * 24 * 60 * 60 * 1000);

    const { accessToken } = await ensureWhoopAccessTokenForPatient(patientId);

    const fetchWithFallback = async <T>(
      fn: () => Promise<T>,
      metricName: string,
    ): Promise<T | null> => {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        console.error(`Failed to fetch Whoop metric [${metricName}]:`, error);
        return null;
      }
    };

    const cycles = await fetchWithFallback(
      () => whoopClient.fetchCycles(accessToken, start, end),
      "cycles",
    );

    const extractRecoveryFromCycles = (cyclesData: any): any => {
      if (!cyclesData) return null;

      const cycleArray = Array.isArray(cyclesData)
        ? cyclesData
        : cyclesData.records || cyclesData.data || [];

      const recoveries = cycleArray.map((cycle: any) => cycle.recovery).filter(Boolean);

      return recoveries.length > 0 ? recoveries : null;
    };

    let recovery = extractRecoveryFromCycles(cycles);
    if (!recovery) {
      recovery = await fetchWithFallback(
        () => whoopClient.fetchRecovery(accessToken, start, end),
        "recovery",
      );
    }

    const [sleep, workouts, bodyMeasurement] = await Promise.all([
      fetchWithFallback(() => whoopClient.fetchSleep(accessToken, start, end), "sleep"),
      fetchWithFallback(() => whoopClient.fetchWorkouts(accessToken, start, end), "workouts"),
      fetchWithFallback(() => whoopClient.fetchBodyMeasurement(accessToken), "bodyMeasurement"),
    ]);

    res.json({
      patientId,
      patientName,
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
        days: rangeDays,
      },
      cycles,
      recovery,
      sleep,
      workouts,
      bodyMeasurement,
    });
  } catch (error) {
    console.error("Whoop metrics error", error);
    if (error instanceof Error && error.message.includes("No Whoop connection")) {
      return res.status(404).json({ error: "Whoop is not connected" });
    }
    if (isMissingPatientContextError(error)) {
      return res.status(404).json({
        error: "Inga omsorgstagare hittades för ditt konto. Lägg till en patient först.",
        code: "NO_PATIENT",
      });
    }
    res.status(500).json({ error: "Failed to load Whoop metrics" });
  }
});

router.get("/heart-rate", authenticate, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { patientId } = await getPatientContextForUser(userId);

    whoopRateLimiter.addActiveUser(userId, patientId);

    const cached = whoopRateLimiter.getCachedHeartRate(patientId);
    if (cached && cached.source === "cache") {
      return res.json({
        heartRate: cached.heartRate,
        cached: true,
        rateLimited: false,
        timestamp: cached.timestamp,
      });
    }

    const rateLimitCheck = whoopRateLimiter.canMakeRequest();
    if (!rateLimitCheck.allowed) {
      if (cached) {
        return res.json({
          heartRate: cached.heartRate,
          cached: true,
          rateLimited: true,
          message: `Rate limit reached. Showing cached data. Next update in ${Math.ceil((rateLimitCheck.waitMs || 0) / 1000)} seconds.`,
          nextAvailableAt: new Date(Date.now() + (rateLimitCheck.waitMs || 0)).toISOString(),
          timestamp: cached.timestamp,
        });
      }

      return res.json({
        heartRate: null,
        cached: false,
        rateLimited: true,
        message: `Rate limit reached: ${rateLimitCheck.reason}. Please try again in ${Math.ceil((rateLimitCheck.waitMs || 0) / 1000)} seconds.`,
        nextAvailableAt: new Date(Date.now() + (rateLimitCheck.waitMs || 0)).toISOString(),
      });
    }

    const { accessToken } = await ensureWhoopAccessTokenForPatient(patientId);
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    let heartRate: number | null = null;

    try {
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

        if (typeof hr === "number" && hr > 0) {
          heartRate = hr;
          break;
        }

        if (workout.metrics?.heart_rate) {
          heartRate = workout.metrics.heart_rate;
          break;
        }
        if (workout.metrics?.average_heart_rate) {
          heartRate = workout.metrics.average_heart_rate;
          break;
        }
        if (workout.score?.metrics?.heart_rate) {
          heartRate = workout.score.metrics.heart_rate;
          break;
        }
      }

      if (heartRate === null) {
        const cycles = await whoopClient.fetchCycles(accessToken, start, end);
        const cycleArray = Array.isArray(cycles)
          ? cycles
          : (cycles as any)?.records || (cycles as any)?.data || [];

        for (const cycle of cycleArray) {
          const hr =
            cycle.score?.average_heart_rate ||
            cycle.score?.max_heart_rate ||
            cycle.score?.heart_rate ||
            cycle.average_heart_rate ||
            cycle.max_heart_rate;

          if (typeof hr === "number" && hr > 0) {
            heartRate = hr;
            break;
          }
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
    } catch (error) {
      console.error("Failed to fetch workout data for heart rate:", error);
      if (cached) {
        return res.json({
          heartRate: cached.heartRate,
          cached: true,
          rateLimited: false,
          message: "Failed to fetch new data, showing cached value.",
          timestamp: cached.timestamp,
        });
      }
    }

    whoopRateLimiter.cacheHeartRate(patientId, heartRate);

    res.json({
      heartRate,
      cached: false,
      rateLimited: false,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Whoop heart rate error", error);

    try {
      const { patientId } = await getPatientContextForUser(userId);
      const cached = whoopRateLimiter.getCachedHeartRate(patientId);
      if (cached) {
        return res.json({
          heartRate: cached.heartRate,
          cached: true,
          rateLimited: false,
          message: "Error fetching data, showing cached value.",
          timestamp: cached.timestamp,
        });
      }
    } catch (ctxError) {
      if (isMissingPatientContextError(ctxError)) {
        return res.status(404).json({
          error: "Inga omsorgstagare hittades för ditt konto. Lägg till en patient först.",
          code: "NO_PATIENT",
        });
      }
    }

    if (error instanceof Error && error.message.includes("No Whoop connection")) {
      return res.status(404).json({ error: "Whoop is not connected" });
    }
    if (isMissingPatientContextError(error)) {
      return res.status(404).json({
        error: "Inga omsorgstagare hittades för ditt konto. Lägg till en patient först.",
        code: "NO_PATIENT",
      });
    }
    res.status(500).json({ error: "Failed to fetch heart rate data" });
  }
});

router.post("/heart-rate/stop", authenticate, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { patientId } = await getPatientContextForUser(userId);
    whoopRateLimiter.removeActiveUser(userId, patientId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing user from queue:", error);
    if (isMissingPatientContextError(error)) {
      return res.status(404).json({
        error: "Inga omsorgstagare hittades för ditt konto. Lägg till en patient först.",
        code: "NO_PATIENT",
      });
    }
    res.status(500).json({ error: "Failed to stop polling" });
  }
});

router.post("/test", authenticate, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { patientId, patientName } = await getPatientContextForUser(userId);
    const { connection, accessToken, refreshToken, expiresAt, refreshTokenExpiresAt } =
      await ensureWhoopAccessTokenForPatient(patientId);
    const profile = await whoopClient.fetchProfile(accessToken);

    await db
      .update(whoopConnections)
      .set({
        whoopUserId: String(profile.user_id ?? connection.whoopUserId),
        accessToken,
        refreshToken,
        expiresAt,
        refreshTokenExpiresAt,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(whoopConnections.id, connection.id));

    res.json({
      ok: true,
      patientId,
      patientName,
      profile,
      tokenInfo: {
        expiresAt,
        refreshTokenExpiresAt,
      },
    });
  } catch (error: any) {
    console.error("Whoop test error", error);
    if (isMissingPatientContextError(error)) {
      return res.status(404).json({
        ok: false,
        error: "Inga omsorgstagare hittades för ditt konto. Lägg till en patient först.",
        code: "NO_PATIENT",
      });
    }
    res.status(500).json({
      ok: false,
      error: error?.message ?? "Failed to contact Whoop",
    });
  }
});

router.delete("/disconnect", authenticate, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { patientId } = await getPatientContextForUser(userId);
    const [connection] = await db
      .select()
      .from(whoopConnections)
      .where(eq(whoopConnections.patientId, patientId))
      .limit(1);

    if (!connection) {
      return res.status(404).json({ error: "No Whoop connection found" });
    }

    await db.delete(whoopConnections).where(eq(whoopConnections.id, connection.id));

    res.json({ success: true, message: "Whoop connection removed" });
  } catch (error) {
    console.error("Whoop disconnect error", error);
    if (isMissingPatientContextError(error)) {
      return res.status(404).json({
        error: "Inga omsorgstagare hittades för ditt konto. Lägg till en patient först.",
        code: "NO_PATIENT",
      });
    }
    res.status(500).json({ error: "Failed to disconnect Whoop" });
  }
});

export default router;

function removeTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

function buildRedirect(base: string, params: Record<string, string | undefined>): string {
  try {
    const target = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        target.searchParams.set(key, value);
      }
    });
    return target.toString();
  } catch {
    const query = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
      .join("&");
    if (!query) {
      return base;
    }
    return `${base}${base.includes("?") ? "&" : "?"}${query}`;
  }
}

function clampRange(raw: number) {
  if (Number.isNaN(raw) || !Number.isFinite(raw)) return 7;
  return Math.min(Math.max(Math.floor(raw), 1), 30);
}

function isMissingPatientContextError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("not associated with a patient");
}
