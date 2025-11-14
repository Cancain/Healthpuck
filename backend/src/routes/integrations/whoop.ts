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
        console.log(`Successfully fetched ${metricName}:`, {
          hasData: result !== null && result !== undefined,
          type: Array.isArray(result) ? "array" : typeof result,
          isObject: typeof result === "object" && result !== null,
        });
        return result;
      } catch (error) {
        console.error(`Failed to fetch Whoop metric [${metricName}]:`, error);
        if (error instanceof Error) {
          console.error(`  Error message: ${error.message}`);
        }
        return null;
      }
    };

    const [cycles, recovery] = await Promise.all([
      fetchWithFallback(() => whoopClient.fetchCycles(accessToken, start, end), "cycles"),
      fetchWithFallback(() => whoopClient.fetchRecovery(accessToken, start, end), "recovery"),
    ]);

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
    res.status(500).json({ error: "Failed to load Whoop metrics" });
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
    res.status(500).json({
      ok: false,
      error: error?.message ?? "Failed to contact Whoop",
    });
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
