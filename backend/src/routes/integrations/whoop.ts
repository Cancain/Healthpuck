import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { eq } from "drizzle-orm";

import authenticate, { getUserIdFromRequest } from "../../middleware/auth";
import { db } from "../../db";
import { whoopConnections } from "../../db/schema";
import { WhoopClient } from "../../utils/whoopClient";
import { serializeState, parseAndValidateState } from "../../utils/whoopState";

const router = Router();
const whoopClient = WhoopClient.create();
const scopeList = (process.env.WHOOP_SCOPE ?? "offline read:profile")
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

router.get("/connect", authenticate, (req: Request, res: Response, next: NextFunction) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const state = serializeState({ userId });
  passport.authenticate("whoop", { scope: scopeList, state, session: false })(req, res, next);
});

router.get(
  "/callback",
  (req: Request, res: Response, next: NextFunction) => {
    const stateParam = req.query.state as string | undefined;
    if (!stateParam) {
      return res.status(400).json({ error: "Missing state parameter" });
    }

    try {
      req.whoopState = parseAndValidateState(stateParam);
      next();
    } catch (error) {
      console.error("Invalid Whoop state", error);
      res.status(400).json({
        error: "Invalid state",
        detail: error instanceof Error ? error.message : String(error),
      });
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
    const [connection] = await db
      .select()
      .from(whoopConnections)
      .where(eq(whoopConnections.userId, userId))
      .limit(1);

    if (!connection) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
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

router.post("/test", authenticate, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const [connection] = await db
      .select()
      .from(whoopConnections)
      .where(eq(whoopConnections.userId, userId))
      .limit(1);

    if (!connection) {
      return res.status(404).json({ error: "Whoop is not connected" });
    }

    let accessToken = connection.accessToken;
    let refreshToken = connection.refreshToken;
    let expiresAt = connection.expiresAt;
    let refreshTokenExpiresAt = connection.refreshTokenExpiresAt;

    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      const refreshed = await whoopClient.refreshTokens(connection.refreshToken);
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;
      expiresAt = refreshed.expiresAt;
      refreshTokenExpiresAt = refreshed.refreshTokenExpiresAt ?? null;

      await db
        .update(whoopConnections)
        .set({
          accessToken,
          refreshToken,
          expiresAt,
          refreshTokenExpiresAt,
          tokenType: refreshed.tokenType,
          scope: refreshed.scope,
          updatedAt: new Date(),
        })
        .where(eq(whoopConnections.id, connection.id));
    }

    const profile = await whoopClient.fetchProfile(accessToken);

    await db
      .update(whoopConnections)
      .set({
        whoopUserId: String(profile.user_id ?? connection.whoopUserId),
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(whoopConnections.id, connection.id));

    res.json({
      ok: true,
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
