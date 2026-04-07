// server/_core/index.ts
import "dotenv/config";
import { createServer } from "http";
import net from "net";

// server/_core/app.ts
import express2 from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import pinoHttp from "pino-http";

// shared/const.ts
var ACCESS_COOKIE_NAME = "lw_at";
var REFRESH_COOKIE_NAME = "lw_rt";
var ACCESS_TOKEN_TTL_MS = 15 * 60 * 1e3;
var REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
var SESSION_IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1e3;
var SESSION_ABSOLUTE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1e3;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";

// drizzle/schema.ts
import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  verificationToken: varchar("verificationToken", { length: 255 }),
  verificationTokenExpires: timestamp("verificationTokenExpires"),
  resetPasswordToken: varchar("resetPasswordToken", { length: 255 }),
  resetPasswordExpires: timestamp("resetPasswordExpires"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
}, (table) => ({
  emailUnique: uniqueIndex("users_email_unique").on(table.email)
}));
var leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }),
  email: varchar("email", { length: 320 }).notNull(),
  plan: varchar("plan", { length: 255 }).notNull(),
  message: text("message"),
  status: mysqlEnum("status", ["new", "contacted", "converted", "lost"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  planId: varchar("planId", { length: 255 }).notNull(),
  // 'Basic Care', 'Business Care', 'Premium Growth Care'
  status: mysqlEnum("status", ["active", "canceled", "past_due"]).default("active").notNull(),
  gatewaySubscriptionId: varchar("gatewaySubscriptionId", { length: 255 }),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  idempotencyKey: varchar("idempotencyKey", { length: 255 }).unique(),
  gatewayOrderId: varchar("gatewayOrderId", { length: 255 }),
  amount: int("amount").notNull(),
  // in cents
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  receiptUrl: varchar("receiptUrl", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  orderId: int("orderId").references(() => orders.id),
  rating: int("rating").notNull(),
  // 1-5
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
import { z as z2 } from "zod";
var envSchema = z2.object({
  NODE_ENV: z2.enum(["development", "test", "production"]).default("development"),
  PORT: z2.coerce.number().int().positive().default(3e3),
  JWT_SECRET: z2.string().min(32, "JWT_SECRET must be at least 32 characters"),
  DATABASE_URL: z2.string().url().optional(),
  VITE_APP_ID: z2.string().min(1, "VITE_APP_ID is required"),
  OAUTH_SERVER_URL: z2.string().url().optional(),
  OWNER_OPEN_ID: z2.string().optional().default(""),
  BUILT_IN_FORGE_API_URL: z2.string().url().optional().default(""),
  BUILT_IN_FORGE_API_KEY: z2.string().optional().default(""),
  INFINITY_KEY_ID: z2.string().optional().default(""),
  INFINITY_KEY_SECRET: z2.string().optional().default(""),
  ALLOWED_ORIGINS: z2.string().optional(),
  REDIS_URL: z2.string().optional(),
  COOKIE_DOMAIN: z2.string().optional()
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("[Env] Invalid configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
var env = parsed.data;
var isProduction = env.NODE_ENV === "production";
if (isProduction && !env.DATABASE_URL) {
  console.error("[Env] DATABASE_URL is required in production");
  process.exit(1);
}
var defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];
var allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean) : defaultAllowedOrigins;
var ENV = {
  appId: env.VITE_APP_ID,
  cookieSecret: env.JWT_SECRET,
  databaseUrl: env.DATABASE_URL ?? "",
  oAuthServerUrl: env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: env.OWNER_OPEN_ID ?? "",
  isProduction,
  isDevelopment: env.NODE_ENV === "development",
  forgeApiUrl: env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: env.BUILT_IN_FORGE_API_KEY ?? "",
  infinityKeyId: env.INFINITY_KEY_ID ?? "",
  infinityKeySecret: env.INFINITY_KEY_SECRET ?? "",
  allowedOrigins,
  redisUrl: env.REDIS_URL ?? "",
  cookieDomain: env.COOKIE_DOMAIN ?? void 0,
  port: env.PORT
};
if (ENV.cookieSecret.length < 32) {
  console.error("[Env] JWT_SECRET must be at least 32 characters.");
  process.exit(1);
}

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod", "passwordHash"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createLead(data) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create lead: database not available");
    return null;
  }
  try {
    const result = await db.insert(leads).values(data);
    return { ...data, id: result[0].insertId };
  } catch (error) {
    console.error("[Database] Failed to create lead:", error);
    throw error;
  }
}
async function getLeads() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get leads: database not available");
    return [];
  }
  try {
    return await db.select().from(leads).orderBy(leads.createdAt);
  } catch (error) {
    console.error("[Database] Failed to get leads:", error);
    throw error;
  }
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  leads: router({
    create: {
      input: z.object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        email: z.string().email(),
        plan: z.string().min(1),
        message: z.string().optional()
      }),
      async resolve({ input }) {
        const lead = await createLead({
          firstName: input.firstName,
          lastName: input.lastName || null,
          email: input.email,
          plan: input.plan,
          message: input.message || null,
          status: "new"
        });
        await notifyOwner({
          title: "New Lead Submission",
          content: `${input.firstName} ${input.lastName || ""} (${input.email}) is interested in ${input.plan}. Message: ${input.message || "N/A"}`
        });
        return lead;
      }
    },
    list: {
      async resolve() {
        return await getLeads();
      }
    }
  })
});

// server/_core/sdk.ts
import { randomUUID } from "node:crypto";

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

// server/_core/cookies.ts
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
function isIpAddress(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = ENV.isProduction || isSecureRequest(req);
  const sameSite = secure ? "strict" : "lax";
  const domain = ENV.cookieDomain || req.hostname && !LOCAL_HOSTS.has(req.hostname) && !isIpAddress(req.hostname) && req.hostname || void 0;
  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure,
    domain
  };
}
function getAccessCookieOptions(req) {
  return {
    ...getSessionCookieOptions(req),
    maxAge: ACCESS_TOKEN_TTL_MS
  };
}
function getRefreshCookieOptions(req) {
  return {
    ...getSessionCookieOptions(req),
    maxAge: REFRESH_TOKEN_TTL_MS
  };
}
function clearSessionCookies(res, req) {
  const baseOptions = { ...getSessionCookieOptions(req), maxAge: 0 };
  res.clearCookie(ACCESS_COOKIE_NAME, baseOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions);
}

// server/_core/sdk.ts
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var refreshStore = /* @__PURE__ */ new Map();
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed2 = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed2));
  }
  getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }
  generateJti() {
    return randomUUID();
  }
  async signToken(payload, expiresInMs, tokenType) {
    const issuedAtSeconds = Math.floor(Date.now() / 1e3);
    const expirationSeconds = issuedAtSeconds + Math.floor(expiresInMs / 1e3);
    const secretKey = this.getSessionSecret();
    const jti = this.generateJti();
    const token = await new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
      tokenType
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt(issuedAtSeconds).setExpirationTime(expirationSeconds).setAudience(payload.appId).setSubject(payload.openId).setJti(jti).sign(secretKey);
    return { token, jti, expMs: expirationSeconds * 1e3 };
  }
  async verifyToken(token, expectedType) {
    const secretKey = this.getSessionSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
      audience: ENV.appId
    });
    const { openId, appId, name, tokenType, jti, exp } = payload;
    if (tokenType !== expectedType || typeof openId !== "string" || typeof appId !== "string" || typeof name !== "string" || typeof jti !== "string" || typeof exp !== "number") {
      throw ForbiddenError("Invalid token payload");
    }
    return {
      openId,
      appId,
      name,
      jti,
      exp
    };
  }
  rememberRefreshToken(openId, jti, expiresAt) {
    refreshStore.set(openId, { jti, expiresAt, lastRotated: Date.now() });
  }
  assertRefreshNotRevoked(openId, jti) {
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
  async createSessionPair(payload) {
    const access = await this.signToken(payload, ACCESS_TOKEN_TTL_MS, "access");
    const refresh = await this.signToken(
      payload,
      REFRESH_TOKEN_TTL_MS,
      "refresh"
    );
    this.rememberRefreshToken(payload.openId, refresh.jti, refresh.expMs);
    return { accessToken: access.token, refreshToken: refresh.token };
  }
  setSessionCookies(res, req, tokens) {
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
  async hydrateUserFromSession(session, req) {
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(session.openId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(
          req.headers.cookie ?? ""
        );
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
  async issueSessionForUser(user, req, res) {
    const payload = {
      openId: user.openId,
      appId: ENV.appId,
      name: user.name || user.email || "User"
    };
    const tokens = await this.createSessionPair(payload);
    this.setSessionCookies(res, req, tokens);
  }
  async tryVerifyAccess(accessToken) {
    if (!accessToken) return null;
    try {
      return await this.verifyToken(accessToken, "access");
    } catch (err) {
      return null;
    }
  }
  async tryRefresh(refreshToken, req, res) {
    if (!refreshToken || !res) return null;
    try {
      const session = await this.verifyToken(refreshToken, "refresh");
      this.assertRefreshNotRevoked(session.openId, session.jti);
      const user = await this.hydrateUserFromSession(session, req);
      const tokens = await this.createSessionPair({
        openId: session.openId,
        appId: session.appId,
        name: session.name
      });
      this.setSessionCookies(res, req, tokens);
      return user;
    } catch (err) {
      console.warn("[Auth] Refresh failed", err);
      return null;
    }
  }
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req, res) {
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
  async logout(user, req, res) {
    if (user) {
      refreshStore.delete(user.openId);
    }
    clearSessionCookies(res, req);
  }
};
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req, opts.res);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production" || process.env.MODE === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  base: "/",
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/security.ts
import cors from "cors";
import helmet from "helmet";
function applySecurityMiddleware(app) {
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  const connectSources = ["'self'"];
  if (ENV.oAuthServerUrl) connectSources.push(ENV.oAuthServerUrl);
  if (ENV.forgeApiUrl) connectSources.push(ENV.forgeApiUrl);
  app.use(
    helmet({
      hsts: ENV.isProduction ? { maxAge: 63072e3, includeSubDomains: true, preload: true } : void 0,
      contentSecurityPolicy: ENV.isDevelopment ? false : {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://checkout.infinity.com"
          ],
          styleSrc: [
            "'self'",
            "https://fonts.googleapis.com",
            "'unsafe-inline'"
          ],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: connectSources,
          frameSrc: ["'self'", "https://checkout.infinity.com"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"]
        }
      },
      referrerPolicy: { policy: "no-referrer" },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-site" }
    })
  );
  const corsOptions = {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (ENV.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true
  };
  app.use(cors(corsOptions));
}

// server/_core/rateLimiter.ts
import Redis from "ioredis";
import {
  RateLimiterMemory,
  RateLimiterRedis
} from "rate-limiter-flexible";
var redisClient = ENV.redisUrl ? new Redis(ENV.redisUrl, { enableOfflineQueue: false, maxRetriesPerRequest: 1 }) : null;
function buildLimiter(config) {
  if (redisClient) {
    return new RateLimiterRedis({
      storeClient: redisClient,
      ...config
    });
  }
  return new RateLimiterMemory(config);
}
function getKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  }
  return req.ip || "unknown";
}
function toMiddleware(limiter) {
  return async (req, res, next) => {
    try {
      await limiter.consume(getKey(req));
      next();
    } catch (err) {
      const retryAfter = Math.ceil((err?.msBeforeNext ?? 1e3) / 1e3);
      res.setHeader("Retry-After", retryAfter.toString());
      res.status(429).json({
        message: "Too many requests. Please slow down."
      });
    }
  };
}
function createRateLimiters() {
  return {
    general: toMiddleware(
      buildLimiter({ points: 100, duration: 60, keyPrefix: "rl_general" })
    ),
    auth: toMiddleware(
      buildLimiter({
        points: 5,
        duration: 15 * 60,
        blockDuration: 15 * 60,
        keyPrefix: "rl_auth"
      })
    ),
    passwordReset: toMiddleware(
      buildLimiter({
        points: 3,
        duration: 60 * 60,
        blockDuration: 60 * 60,
        keyPrefix: "rl_pwreset"
      })
    ),
    signup: toMiddleware(
      buildLimiter({
        points: 3,
        duration: 60 * 60,
        blockDuration: 60 * 60,
        keyPrefix: "rl_signup"
      })
    ),
    payment: toMiddleware(
      buildLimiter({
        points: 3,
        duration: 10 * 60,
        blockDuration: 10 * 60,
        keyPrefix: "rl_payment"
      })
    ),
    ai: toMiddleware(
      buildLimiter({
        points: 10,
        duration: 60,
        blockDuration: 60,
        keyPrefix: "rl_ai"
      })
    )
  };
}

// server/services/automation.ts
import { randomBytes } from "crypto";
async function generateServiceAgreementPDF(userId, plan) {
  console.log(`[PDF Gen] Generating Service Agreement for plan: ${plan}`);
  return Buffer.from("%PDF-1.4 Mock Service Agreement PDF Content");
}
async function generateInvoicePDF(orderId, amount) {
  console.log(`[PDF Gen] Generating Invoice for order: ${orderId} - Amount: $${(amount / 100).toFixed(2)}`);
  return Buffer.from("%PDF-1.4 Mock Invoice PDF Content");
}
async function uploadToSecureBucket(fileName, buffer) {
  const fileKey = randomBytes(16).toString("hex") + "-" + fileName;
  console.log(`[S3 Mock] Uploading ${fileName} to encrypted bucket...`);
  const presignedUrl = `https://s3.mock.aws.com/secure-bucket/${fileKey}?X-Amz-Expires=3600&Signature=MockSig`;
  return presignedUrl;
}
async function sendPostPaymentEmails(email, documentUrls) {
  console.log(`[Email Mock (SendGrid/SES)] Sending Post-Payment Documents to ${email}.`);
  console.log(`[Email Mock (SendGrid/SES)] Attached Links (Expires in 1 hour):`, documentUrls);
}
async function handlePostPaymentAutomation(userId, email, orderId, amount, plan) {
  try {
    const agreementBuffer = await generateServiceAgreementPDF(userId, plan);
    const invoiceBuffer = await generateInvoicePDF(orderId, amount);
    const agreementUrl = await uploadToSecureBucket("Service_Agreement.pdf", agreementBuffer);
    const invoiceUrl = await uploadToSecureBucket("Invoice.pdf", invoiceBuffer);
    await sendPostPaymentEmails(email, [agreementUrl, invoiceUrl]);
    console.log(`[Post-Payment Automation] Successfully completed for user ${userId}`);
  } catch (err) {
    console.error("[Post-Payment Automation Failed]", err);
  }
}

// server/_core/app.ts
function createApp(options = {}) {
  const app = express2();
  const rateLimiters = createRateLimiters();
  app.use(
    pinoHttp({
      level: ENV.isProduction ? "info" : "debug",
      redact: ["req.headers.authorization", "req.headers.cookie"]
    })
  );
  applySecurityMiddleware(app);
  app.use(express2.json({ limit: "100kb" }));
  app.use(express2.urlencoded({ limit: "1mb", extended: true }));
  app.use(rateLimiters.general);
  app.use("/api/trpc/auth.login", rateLimiters.auth);
  app.use("/api/trpc/auth.register", rateLimiters.signup);
  app.use("/api/trpc/payments.createOrder", rateLimiters.payment);
  app.post("/api/webhooks/infinity", express2.raw({ type: "application/json" }), async (req, res) => {
    try {
      const event = JSON.parse(req.body);
      if (event.type === "order.paid") {
        console.log(`[Webhook] Order ${event.orderId} Paid! Starting automation...`);
        handlePostPaymentAutomation(event.userId, event.email, event.orderId, event.amount, event.plan).catch(console.error);
      }
      res.status(200).send("OK");
    } catch (err) {
      console.error("[Webhook Error]", err);
      res.status(400).send("Webhook Error");
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (options.useStatic && !ENV.isDevelopment) {
    serveStatic(app);
  }
  return app;
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = createApp({ useStatic: !ENV.isDevelopment });
  const server = createServer(app);
  if (ENV.isDevelopment) {
    await setupVite(app, server);
  }
  const preferredPort = ENV.port;
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
