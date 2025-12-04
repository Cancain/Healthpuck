import passport from "passport";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import type { Request } from "express";

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

      const result = await db
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

      console.log(`[Whoop OAuth] Connection saved:`, result[0]?.id);

      done(null, { userId }, { whoopUserId, scope: params?.scope, expiresAt, patientId });
    } catch (error) {
      done(error as Error);
    }
  },
);

// Force OAuth2 token requests to use client_secret_post rather than HTTP Basic auth.
const oauth2Client = (whoopStrategy as any)._oauth2 as any;
const originalRequest = oauth2Client._request.bind(oauth2Client);
oauth2Client._request = function (
  method: string,
  url: string,
  headers: Record<string, string>,
  postBody: string,
  accessToken: string,
  callback: (error: any, data?: any, response?: any) => void,
) {
  if (url === `${oauthBase}/token`) {
    // Remove any Authorization header added by default
    const { Authorization, authorization, ...restHeaders } = headers || {};
    const augmentedBody = postBody
      ? `${postBody}&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
      : `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;

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
