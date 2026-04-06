import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().url().optional(),
  VITE_APP_ID: z.string().min(1, "VITE_APP_ID is required"),
  OAUTH_SERVER_URL: z.string().url().optional(),
  OWNER_OPEN_ID: z.string().optional().default(""),
  BUILT_IN_FORGE_API_URL: z.string().url().optional().default(""),
  BUILT_IN_FORGE_API_KEY: z.string().optional().default(""),
  INFINITY_KEY_ID: z.string().optional().default(""),
  INFINITY_KEY_SECRET: z.string().optional().default(""),
  ALLOWED_ORIGINS: z.string().optional(),
  REDIS_URL: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[Env] Invalid configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;
const isProduction = env.NODE_ENV === "production";

if (isProduction && !env.DATABASE_URL) {
  console.error("[Env] DATABASE_URL is required in production");
  process.exit(1);
}

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(",").map(origin => origin.trim()).filter(Boolean)
  : defaultAllowedOrigins;

export const ENV = {
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
  cookieDomain: env.COOKIE_DOMAIN ?? undefined,
  port: env.PORT,
};

// Hard fail if secrets are obviously weak
if (ENV.cookieSecret.length < 32) {
  console.error("[Env] JWT_SECRET must be at least 32 characters.");
  process.exit(1);
}
