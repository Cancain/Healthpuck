import crypto from "crypto";

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
    this.apiBaseUrl = process.env.WHOOP_API_BASE_URL ?? "https://api.prod.whoop.com/developer/v1";
    this.defaultScope = process.env.WHOOP_SCOPE ?? "offline_access read:profile";
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
    const url = new URL("user/profile/basic", this.apiBaseUrl);
    console.log("[whoop] fetching profile", { url: url.toString() });
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
}
