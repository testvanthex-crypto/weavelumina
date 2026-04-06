import { randomUUID } from "node:crypto";
import {
  ACCESS_COOKIE_NAME,
  ACCESS_TOKEN_TTL_MS,
  AXIOS_TIMEOUT_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
} from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getAccessCookieOptions, getRefreshCookieOptions, clearSessionCookies } from "./cookies";
import { ENV } from "./env";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";

type TokenType = "access" | "refresh";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

type VerifiedSession = SessionPayload & { jti: string; exp: number };
type RefreshRecord = { jti: string; expiresAt: number; lastRotated: number };

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

const refreshStore = new Map<string, RefreshRecord>();

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }

  private decodeState(state: string): string {
    const redirectUri = atob(state);
    return redirectUri;
  }

  async getTokenByCode(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };

    const { data } = await this.client.post<ExchangeTokenResponse>(
      EXCHANGE_TOKEN_PATH,
      payload
    );

    return data;
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse
  ): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken,
      }
    );

    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  private generateJti() {
    return randomUUID();
  }

  private async signToken(
    payload: SessionPayload,
    expiresInMs: number,
    tokenType: TokenType
  ): Promise<{ token: string; jti: string; expMs: number }> {
    const issuedAtSeconds = Math.floor(Date.now() / 1000);
    const expirationSeconds = issuedAtSeconds + Math.floor(expiresInMs / 1000);
    const secretKey = this.getSessionSecret();
    const jti = this.generateJti();

    const token = await new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
      tokenType,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(issuedAtSeconds)
      .setExpirationTime(expirationSeconds)
      .setAudience(payload.appId)
      .setSubject(payload.openId)
      .setJti(jti)
      .sign(secretKey);

    return { token, jti, expMs: expirationSeconds * 1000 };
  }

  private async verifyToken(
    token: string,
    expectedType: TokenType
  ): Promise<VerifiedSession> {
    const secretKey = this.getSessionSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
      audience: ENV.appId,
    });
    const { openId, appId, name, tokenType, jti, exp } =
      payload as Record<string, unknown>;

    if (
      tokenType !== expectedType ||
      typeof openId !== "string" ||
      typeof appId !== "string" ||
      typeof name !== "string" ||
      typeof jti !== "string" ||
      typeof exp !== "number"
    ) {
      throw ForbiddenError("Invalid token payload");
    }

    return {
      openId,
      appId,
      name,
      jti,
      exp,
    };
  }

  private rememberRefreshToken(openId: string, jti: string, expiresAt: number) {
    refreshStore.set(openId, { jti, expiresAt, lastRotated: Date.now() });
  }

  private assertRefreshNotRevoked(openId: string, jti: string) {
    const record = refreshStore.get(openId);
    if (!record) {
      throw ForbiddenError("Refresh token not recognized");
    }
    if (record.expiresAt < Date.now()) {
      refreshStore.delete(openId);
      throw ForbiddenError("Refresh token expired");
    }
    if (record.jti !== jti) {
      throw ForbiddenError("Refresh token rotated");
    }
  }

  private async createSessionPair(payload: SessionPayload) {
    const access = await this.signToken(payload, ACCESS_TOKEN_TTL_MS, "access");
    const refresh = await this.signToken(
      payload,
      REFRESH_TOKEN_TTL_MS,
      "refresh"
    );
    this.rememberRefreshToken(payload.openId, refresh.jti, refresh.expMs);
    return { accessToken: access.token, refreshToken: refresh.token };
  }

  private setSessionCookies(
    res: Response,
    req: Request,
    tokens: { accessToken: string; refreshToken: string }
  ) {
    res.cookie(
      ACCESS_COOKIE_NAME,
      tokens.accessToken,
      getAccessCookieOptions(req)
    );
    res.cookie(
      REFRESH_COOKIE_NAME,
      tokens.refreshToken,
      getRefreshCookieOptions(req)
    );
  }

  private async hydrateUserFromSession(
    session: VerifiedSession,
    req: Request
  ): Promise<User> {
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(session.openId);

    // If user not in DB, sync from OAuth server automatically
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(
          req.headers.cookie ?? ""
        );
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }

  async issueSessionForUser(
    user: Pick<User, "openId" | "name" | "email">,
    req: Request,
    res: Response
  ): Promise<void> {
    const payload: SessionPayload = {
      openId: user.openId,
      appId: ENV.appId,
      name: user.name || user.email || "User",
    };
    const tokens = await this.createSessionPair(payload);
    this.setSessionCookies(res, req, tokens);
  }

  private async tryVerifyAccess(
    accessToken: string | undefined
  ): Promise<VerifiedSession | null> {
    if (!accessToken) return null;
    try {
      return await this.verifyToken(accessToken, "access");
    } catch (err) {
      return null;
    }
  }

  private async tryRefresh(
    refreshToken: string | undefined,
    req: Request,
    res?: Response
  ): Promise<User | null> {
    if (!refreshToken || !res) return null;
    try {
      const session = await this.verifyToken(refreshToken, "refresh");
      this.assertRefreshNotRevoked(session.openId, session.jti);

      const user = await this.hydrateUserFromSession(session, req);

      // Rotate tokens
      const tokens = await this.createSessionPair({
        openId: session.openId,
        appId: session.appId,
        name: session.name,
      });
      this.setSessionCookies(res, req, tokens);
      return user;
    } catch (err) {
      console.warn("[Auth] Refresh failed", err);
      return null;
    }
  }

  async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  async getUserInfoWithJwt(
    jwtToken: string
  ): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken,
      projectId: ENV.appId,
    };

    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );

    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoWithJwtResponse;
  }

  async authenticateRequest(
    req: Request,
    res?: Response
  ): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const accessToken = cookies.get(ACCESS_COOKIE_NAME);
    const refreshToken = cookies.get(REFRESH_COOKIE_NAME);

    const verified = await this.tryVerifyAccess(accessToken);
    if (verified) {
      return this.hydrateUserFromSession(verified, req);
    }

    const refreshedUser = await this.tryRefresh(refreshToken, req, res);
    if (refreshedUser) {
      return refreshedUser;
    }

    throw ForbiddenError("Invalid session cookie");
  }

  async logout(user: User | null, req: Request, res: Response) {
    if (user) {
      refreshStore.delete(user.openId);
    }
    clearSessionCookies(res, req);
  }
}

export const sdk = new SDKServer();
