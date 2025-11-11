import { Router, Request, Response } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";

import authenticate, { getUserIdFromRequest } from "../../middleware/auth";
import { db } from "../../db";
import { whoopConnections } from "../../db/schema";
import { WhoopClient } from "../../utils/whoopClient";

const router = Router();
const whoopClient = WhoopClient.create();
const stateSecret = resolveStateSecret();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

router.use(authenticate);

router.get("/connect", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const state = serializeState({ userId });
    const authorizeUrl = whoopClient.getAuthorizeUrl({ state });

    res.json({ authorizeUrl, state });
  } catch (error) {
    console.error("Error creating Whoop authorization URL", error);
    res.status(500).json({ error: "Failed to initiate Whoop connection" });
  }
});

router.get("/callback", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const code = req.query.code as string | undefined;
  const stateParam = req.query.state as string | undefined;

  if (!code || !stateParam) {
    return res.status(400).json({ error: "Missing code or state" });
  }

  try {
    const state = parseAndValidateState(stateParam);
    if (state.userId !== userId) {
      return res.status(400).json({ error: "State mismatch" });
    }

    const tokenSet = await whoopClient.exchangeCodeForTokens(code);
    const profile = await whoopClient.fetchProfile(tokenSet.accessToken);

    await db
      .insert(whoopConnections)
      .values({
        userId,
        whoopUserId: String(profile.user_id ?? ""),
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken,
        tokenType: tokenSet.tokenType,
        scope: tokenSet.scope,
        expiresAt: tokenSet.expiresAt,
        refreshTokenExpiresAt: tokenSet.refreshTokenExpiresAt ?? null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: whoopConnections.userId,
        set: {
          whoopUserId: String(profile.user_id ?? ""),
          accessToken: tokenSet.accessToken,
          refreshToken: tokenSet.refreshToken,
          tokenType: tokenSet.tokenType,
          scope: tokenSet.scope,
          expiresAt: tokenSet.expiresAt,
          refreshTokenExpiresAt: tokenSet.refreshTokenExpiresAt ?? null,
          updatedAt: new Date(),
        },
      });

    res.json({
      status: "connected",
      whoopUserId: profile.user_id,
      scope: tokenSet.scope,
      expiresAt: tokenSet.expiresAt,
    });
  } catch (error) {
    console.error("Whoop callback error", error);
    res.status(500).json({ error: "Failed to complete Whoop connection" });
  }
});

router.get("/status", async (req: Request, res: Response) => {
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

router.post("/test", async (req: Request, res: Response) => {
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

function serializeState(input: { userId: number }) {
  const payload = {
    uid: input.userId,
    nonce: crypto.randomBytes(12).toString("hex"),
    ts: Date.now(),
  };
  const payloadString = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", stateSecret).update(payloadString).digest("hex");

  return Buffer.from(`${payloadString}.${signature}`).toString("base64url");
}

function parseAndValidateState(state: string) {
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    throw new Error("Invalid state encoding");
  }

  const [payloadString, signature] = decoded.split(".");
  if (!payloadString || !signature) {
    throw new Error("Invalid state format");
  }

  const expectedSignature = crypto
    .createHmac("sha256", stateSecret)
    .update(payloadString)
    .digest("hex");

  let providedSignature: Buffer;
  let expectedSignatureBuffer: Buffer;
  try {
    providedSignature = Buffer.from(signature, "hex");
    expectedSignatureBuffer = Buffer.from(expectedSignature, "hex");
  } catch {
    throw new Error("Invalid state signature encoding");
  }

  if (providedSignature.length !== expectedSignatureBuffer.length) {
    throw new Error("Invalid state signature length");
  }

  if (!crypto.timingSafeEqual(providedSignature, expectedSignatureBuffer)) {
    throw new Error("Invalid state signature");
  }

  const payload = JSON.parse(payloadString) as { uid: number; nonce: string; ts: number };

  if (!payload?.uid || !payload?.nonce || !payload?.ts) {
    throw new Error("Invalid state payload");
  }

  if (Date.now() - payload.ts > STATE_TTL_MS) {
    throw new Error("State has expired");
  }

  return { userId: payload.uid, nonce: payload.nonce, timestamp: payload.ts };
}

function resolveStateSecret(): string {
  const secret =
    process.env.WHOOP_STATE_SECRET ?? process.env.JWT_SECRET ?? process.env.WHOOP_CLIENT_SECRET;

  if (!secret) {
    throw new Error("Missing state secret for Whoop OAuth flow");
  }

  return secret;
}

export default router;
