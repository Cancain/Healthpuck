import passport from "passport";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import type { Request } from "express";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { whoopConnections } from "../db/schema";
import { parseAndValidateState, WhoopState } from "../utils/whoopState";

declare module "express-serve-static-core" {
  interface Request {
    whoopState?: WhoopState;
  }
}

const oauthBase = (
  process.env.WHOOP_OAUTH_BASE_URL || "https://api.prod.whoop.com/oauth/oauth2"
).replace(/\/$/, "");
const apiBase =
  (process.env.WHOOP_API_BASE_URL || "https://api.prod.whoop.com/developer/v2").replace(/\/$/, "") +
  "/";
const clientId = process.env.WHOOP_CLIENT_ID;
const clientSecret = process.env.WHOOP_CLIENT_SECRET;
const callbackURL = process.env.WHOOP_REDIRECT_URI;

if (!clientId || !clientSecret || !callbackURL) {
  throw new Error("Missing WHOOP OAuth environment configuration");
}

console.log(`[Whoop OAuth] Strategy configured with callbackURL: ${callbackURL}`);

const whoopStrategy = new OAuth2Strategy(
  {
    authorizationURL: `${oauthBase}/auth`,
    tokenURL: `${oauthBase}/token`,
    clientID: clientId,
    clientSecret,
    callbackURL,
    passReqToCallback: true,
  },
  async (
    req: Request,
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: any,
    done: (err: Error | null, user?: any, info?: any) => void,
  ) => {
    try {
      const state =
        req.whoopState ?? (req.query.state ? parseAndValidateState(String(req.query.state)) : null);
      if (!state) {
        throw new Error("Missing or invalid OAuth state");
      }

      const patientId = state.patientId;
      const userId = state.userId;
      const expiresIn =
        typeof params?.expires_in === "number"
          ? params.expires_in
          : Number(params?.expires_in) || 0;
      const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null;

      const whoopUserId = String(profile?.user_id ?? "");

      console.log(
        `[Whoop OAuth] Saving connection for patientId=${patientId}, userId=${userId}, whoopUserId=${whoopUserId}`,
      );

      let result;
      try {
        const existingByWhoopUserId = await db
          .select()
          .from(whoopConnections)
          .where(eq(whoopConnections.whoopUserId, whoopUserId))
          .limit(1);

        if (existingByWhoopUserId.length > 0) {
          const existing = existingByWhoopUserId[0];
          console.log(
            `[Whoop OAuth] Found existing connection with whoopUserId=${whoopUserId} for patientId=${existing.patientId}, updating to patientId=${patientId}`,
          );

          result = await db
            .update(whoopConnections)
            .set({
              patientId,
              whoopUserId,
              accessToken,
              refreshToken,
              tokenType: params?.token_type ?? "Bearer",
              scope: params?.scope ?? null,
              expiresAt: expiresAt ?? new Date(),
              refreshTokenExpiresAt: null,
              connectedByUserId: userId,
              updatedAt: new Date(),
            })
            .where(eq(whoopConnections.whoopUserId, whoopUserId))
            .returning();
        } else {
          result = await db
            .insert(whoopConnections)
            .values({
              patientId,
              whoopUserId,
              accessToken,
              refreshToken,
              tokenType: params?.token_type ?? "Bearer",
              scope: params?.scope ?? null,
              expiresAt: expiresAt ?? new Date(),
              refreshTokenExpiresAt: null,
              lastSyncedAt: null,
              connectedByUserId: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: whoopConnections.patientId,
              set: {
                whoopUserId,
                accessToken,
                refreshToken,
                tokenType: params?.token_type ?? "Bearer",
                scope: params?.scope ?? null,
                expiresAt: expiresAt ?? new Date(),
                refreshTokenExpiresAt: null,
                connectedByUserId: userId,
                updatedAt: new Date(),
              },
            })
            .returning();
        }

        console.log(
          `[Whoop OAuth] Connection saved successfully: id=${result[0]?.id}, patientId=${result[0]?.patientId}`,
        );
      } catch (dbError) {
        console.error(`[Whoop OAuth] Database error saving connection:`, dbError);
        throw dbError;
      }

      done(null, { userId }, { whoopUserId, scope: params?.scope, expiresAt, patientId });
    } catch (error) {
      done(error as Error);
    }
  },
);

const oauth2Client = (whoopStrategy as any)._oauth2 as any;
const originalRequest = oauth2Client._request.bind(oauth2Client);
const originalGetOAuthAccessToken = oauth2Client.getOAuthAccessToken.bind(oauth2Client);

oauth2Client.getOAuthAccessToken = function (
  code: string,
  params: any,
  callback: (error: any, accessToken?: string, refreshToken?: string, params?: any) => void,
) {
  console.log(`[Whoop OAuth] getOAuthAccessToken called with code: ${code?.substring(0, 20)}...`);
  console.log(
    `[Whoop OAuth] getOAuthAccessToken - OAuth2 client has _req: ${!!(oauth2Client as any)._req}`,
  );
  const req = (oauth2Client as any)._req as Request | undefined;
  params = params || {};

  if (req) {
    let redirectUri: string;
    if (req.query.redirect_uri) {
      redirectUri = String(req.query.redirect_uri);
    } else {
      const protocol = req.protocol || "http";
      const host = req.get("host") || "localhost:3001";
      redirectUri = `${protocol}://${host}/api/integrations/whoop/callback`;
    }
    params.redirect_uri = redirectUri;
    console.log(`[Whoop OAuth] getOAuthAccessToken - Using redirect_uri: ${redirectUri}`);
    console.log(
      `[Whoop OAuth] getOAuthAccessToken - params keys: ${Object.keys(params).join(", ")}`,
    );
  } else {
    console.warn(
      "[Whoop OAuth] No request object found in getOAuthAccessToken, using default callbackURL",
    );
    if (!params.redirect_uri) {
      params.redirect_uri = callbackURL;
      console.log(`[Whoop OAuth] Using default callbackURL: ${callbackURL}`);
    }
  }

  if (!params.grant_type) {
    params.grant_type = "authorization_code";
  }

  return originalGetOAuthAccessToken(code, params, callback);
};

oauth2Client._request = function (
  method: string,
  url: string,
  headers: Record<string, string>,
  postBody: string,
  accessToken: string,
  callback: (error: any, data?: any, response?: any) => void,
) {
  console.log(`[Whoop OAuth] _request called - URL: ${url}, method: ${method}`);
  if (url === `${oauthBase}/token`) {
    const { Authorization, authorization, ...restHeaders } = headers || {};

    let body = postBody || "";
    console.log(`[Whoop OAuth] _request - Original body: ${body}`);
    console.log(`[Whoop OAuth] _request - OAuth2 client has _req: ${!!(oauth2Client as any)._req}`);

    const req = (oauth2Client as any)._req as Request | undefined;
    if (req) {
      let redirectUri: string | undefined;
      if (req.query.redirect_uri) {
        redirectUri = String(req.query.redirect_uri);
      } else {
        const protocol = req.protocol || "http";
        const host = req.get("host") || "localhost:3001";
        redirectUri = `${protocol}://${host}/api/integrations/whoop/callback`;
      }

      if (redirectUri) {
        if (body.includes("redirect_uri=")) {
          body = body.replace(
            /redirect_uri=[^&]+/,
            `redirect_uri=${encodeURIComponent(redirectUri)}`,
          );
          console.log(`[Whoop OAuth] Replaced redirect_uri in body: ${redirectUri}`);
        } else {
          body = body
            ? `${body}&redirect_uri=${encodeURIComponent(redirectUri)}`
            : `redirect_uri=${encodeURIComponent(redirectUri)}`;
          console.log(`[Whoop OAuth] Added redirect_uri to body: ${redirectUri}`);
        }
      }
    } else {
      console.warn("[Whoop OAuth] No request object in _request, redirect_uri may be missing");
    }

    const augmentedBody = body
      ? `${body}&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
      : `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;

    console.log(
      `[Whoop OAuth] Token request body (without secrets): ${augmentedBody.replace(/client_secret=[^&]+/, "client_secret=***")}`,
    );

    return originalRequest(method, url, restHeaders, augmentedBody, accessToken, callback);
  }

  return originalRequest(method, url, headers, postBody, accessToken, callback);
};

whoopStrategy.userProfile = async function (
  accessToken: string,
  done: (err: Error | null, profile?: any) => void,
) {
  try {
    const response = await fetch(`${apiBase}user/profile/basic`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to fetch Whoop profile: ${response.status} ${response.statusText} - ${body}`,
      );
    }

    const profile = await response.json();
    done(null, profile);
  } catch (err) {
    done(err as Error);
  }
};

passport.use("whoop", whoopStrategy);
