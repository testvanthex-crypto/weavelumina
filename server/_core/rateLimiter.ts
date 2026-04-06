import type { Request, Response, NextFunction, RequestHandler } from "express";
import Redis from "ioredis";
import {
  RateLimiterMemory,
  RateLimiterRedis,
  type RateLimiterAbstract,
} from "rate-limiter-flexible";
import { ENV } from "./env";

type LimiterConfig = {
  points: number;
  duration: number;
  blockDuration?: number;
  keyPrefix: string;
};

const redisClient = ENV.redisUrl
  ? new Redis(ENV.redisUrl, { enableOfflineQueue: false, maxRetriesPerRequest: 1 })
  : null;

function buildLimiter(config: LimiterConfig): RateLimiterAbstract {
  if (redisClient) {
    return new RateLimiterRedis({
      storeClient: redisClient,
      ...config,
    });
  }

  return new RateLimiterMemory(config);
}

function getKey(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  }
  return req.ip || "unknown";
}

function toMiddleware(limiter: RateLimiterAbstract): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await limiter.consume(getKey(req));
      next();
    } catch (err: any) {
      const retryAfter = Math.ceil((err?.msBeforeNext ?? 1000) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      res.status(429).json({
        message: "Too many requests. Please slow down.",
      });
    }
  };
}

export function createRateLimiters() {
  return {
    general: toMiddleware(
      buildLimiter({ points: 100, duration: 60, keyPrefix: "rl_general" })
    ),
    auth: toMiddleware(
      buildLimiter({
        points: 5,
        duration: 15 * 60,
        blockDuration: 15 * 60,
        keyPrefix: "rl_auth",
      })
    ),
    passwordReset: toMiddleware(
      buildLimiter({
        points: 3,
        duration: 60 * 60,
        blockDuration: 60 * 60,
        keyPrefix: "rl_pwreset",
      })
    ),
    signup: toMiddleware(
      buildLimiter({
        points: 3,
        duration: 60 * 60,
        blockDuration: 60 * 60,
        keyPrefix: "rl_signup",
      })
    ),
    payment: toMiddleware(
      buildLimiter({
        points: 3,
        duration: 10 * 60,
        blockDuration: 10 * 60,
        keyPrefix: "rl_payment",
      })
    ),
    ai: toMiddleware(
      buildLimiter({
        points: 10,
        duration: 60,
        blockDuration: 60,
        keyPrefix: "rl_ai",
      })
    ),
  };
}
