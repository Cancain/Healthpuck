import crypto from "crypto";

import { whoopRateLimiter } from "./whoopRateLimiter";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in?: number;
  token_type: string;
  scope?: string;
};

type WhoopProfile = {
  user_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  [key: string]: unknown;
};

export type WhoopTokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshTokenExpiresAt?: Date;
  tokenType: string;
  scope?: string;
  raw: TokenResponse;
};

export class WhoopClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly oauthBaseUrl: string;
  private readonly apiBaseUrl: string;
  private readonly defaultScope: string;

  constructor() {
    this.clientId = this.requireEnv("WHOOP_CLIENT_ID");
    this.clientSecret = this.requireEnv("WHOOP_CLIENT_SECRET");
    this.redirectUri = this.requireEnv("WHOOP_REDIRECT_URI");
    this.oauthBaseUrl =
      process.env.WHOOP_OAUTH_BASE_URL ?? "https://api.prod.whoop.com/oauth/oauth2";
    const rawApiBase = process.env.WHOOP_API_BASE_URL ?? "https://api.prod.whoop.com/developer/v2";
    this.apiBaseUrl = rawApiBase.endsWith("/") ? rawApiBase : `${rawApiBase}/`;
    console.log("[whoop] API Base URL configured:", this.apiBaseUrl);

    if (this.apiBaseUrl.includes("/developer/v1") || this.apiBaseUrl.includes("/v1/")) {
      console.warn(
        "[whoop] WARNING: Using API v1 which is deprecated. Please set WHOOP_API_BASE_URL to use v2 endpoints.",
      );
    }
    this.defaultScope =
      process.env.WHOOP_SCOPE ??
      [
        "offline",
        "read:profile",
        "read:recovery",
        "read:cycles",
        "read:sleep",
        "read:workout",
        "read:body_measurement",
      ].join(" ");
  }

  static create() {
    return new WhoopClient();
  }

  getAuthorizeUrl(params?: { state?: string; scope?: string }) {
    const authorizeUrl = new URL(this.joinOAuthPath("/auth"));
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", this.clientId);
    authorizeUrl.searchParams.set("redirect_uri", this.redirectUri);
    authorizeUrl.searchParams.set("scope", params?.scope ?? this.defaultScope);
    authorizeUrl.searchParams.set("state", params?.state ?? this.generateState());
    return authorizeUrl.toString();
  }

  async exchangeCodeForTokens(code: string): Promise<WhoopTokenSet> {
    const tokenUrl = this.joinOAuthPath("/token");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    return this.requestToken(tokenUrl, body);
  }

  async refreshTokens(refreshToken: string): Promise<WhoopTokenSet> {
    const tokenUrl = this.joinOAuthPath("/token");
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    return this.requestToken(tokenUrl, body);
  }

  async fetchProfile(accessToken: string): Promise<WhoopProfile> {
    const url = new URL(this.joinApiPath("user/profile/basic"));
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await this.safeJson(response);
      throw new Error(
        `Failed to fetch Whoop profile: ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`,
      );
    }

    return (await response.json()) as WhoopProfile;
  }

  async fetchCycles(accessToken: string, start: Date, end: Date) {
    return this.fetchWithDateRange(accessToken, "cycle", start, end);
  }

  async fetchRecovery(accessToken: string, start: Date, end: Date) {
    try {
      return await this.fetchWithDateRange(accessToken, "recovery", start, end);
    } catch (error) {
      const cycles = await this.fetchCycles(accessToken, start, end);

      if (Array.isArray(cycles)) {
        const recoveries = cycles
          .map((cycle: any) => {
            if (cycle.recovery) {
              return cycle.recovery;
            }
            return null;
          })
          .filter(Boolean);

        return recoveries.length > 0 ? recoveries : null;
      }

      if (cycles && typeof cycles === "object" && !Array.isArray(cycles)) {
        const cycleArray = (cycles as any).records || (cycles as any).data || [];
        const recoveries = cycleArray.map((cycle: any) => cycle.recovery).filter(Boolean);

        return recoveries.length > 0 ? recoveries : null;
      }

      throw error;
    }
  }

  async fetchSleep(accessToken: string, start: Date, end: Date) {
    return this.fetchWithDateRange(accessToken, "activity/sleep", start, end);
  }

  async fetchWorkouts(accessToken: string, start: Date, end: Date) {
    return this.fetchWithDateRange(accessToken, "activity/workout", start, end);
  }

  async fetchBodyMeasurement(accessToken: string) {
    const url = new URL(this.joinApiPath("user/measurement/body"));
    return this.fetchJson(accessToken, url);
  }

  private async requestToken(url: string, body: URLSearchParams): Promise<WhoopTokenSet> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await this.safeJson(response);
      throw new Error(
        `Whoop token request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`,
      );
    }

    const tokenResponse = (await response.json()) as TokenResponse;
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
    const refreshTokenExpiresAt = tokenResponse.refresh_token_expires_in
      ? new Date(Date.now() + tokenResponse.refresh_token_expires_in * 1000)
      : undefined;

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt,
      refreshTokenExpiresAt,
      tokenType: tokenResponse.token_type,
      scope: tokenResponse.scope,
      raw: tokenResponse,
    };
  }

  private joinOAuthPath(pathname: string) {
    const url = new URL(
      this.oauthBaseUrl.endsWith("/") ? this.oauthBaseUrl : `${this.oauthBaseUrl}/`,
    );
    url.pathname = `${url.pathname.replace(/\/$/, "")}${pathname}`;
    return url.toString();
  }

  private requireEnv(name: string) {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required Whoop configuration: ${name}`);
    }
    return value;
  }

  private generateState() {
    return crypto.randomBytes(16).toString("hex");
  }

  private async safeJson(response: Response) {
    try {
      return await response.clone().json();
    } catch {
      try {
        return await response.clone().text();
      } catch {
        return null;
      }
    }
  }

  private async fetchWithDateRange(accessToken: string, path: string, start: Date, end: Date) {
    const url = new URL(this.joinApiPath(path));
    url.searchParams.set("start", start.toISOString());
    url.searchParams.set("end", end.toISOString());
    const result = await this.fetchJson(accessToken, url);
    return result;
  }

  private async fetchJson(accessToken: string, url: URL) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    whoopRateLimiter.updateRateLimits(response.headers);
    whoopRateLimiter.recordRequest();

    if (!response.ok) {
      const errorBody = await this.safeJson(response);

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        const rateLimitCheck = whoopRateLimiter.canMakeRequest();

        throw new Error(
          `Rate limit exceeded (429): ${errorBody ? JSON.stringify(errorBody) : "Too Many Requests"}. ` +
            `Wait ${waitSeconds ? `${waitSeconds} seconds` : rateLimitCheck.waitMs ? `${Math.ceil(rateLimitCheck.waitMs / 1000)} seconds` : "before retrying"}.`,
        );
      }

      throw new Error(
        `Failed to fetch Whoop data (${url.pathname}): ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`,
      );
    }

    return response.json();
  }

  canMakeRequest(): { allowed: boolean; waitMs?: number; reason?: string } {
    return whoopRateLimiter.canMakeRequest();
  }

  private joinApiPath(pathname: string) {
    const base = this.apiBaseUrl.endsWith("/") ? this.apiBaseUrl : `${this.apiBaseUrl}/`;
    return new URL(pathname, base).toString();
  }
}
