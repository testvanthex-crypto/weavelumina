import type { CookieOptions, Request, Response } from "express";
import {
  ACCESS_COOKIE_NAME,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
} from "@shared/const";
import { ENV } from "./env";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = ENV.isProduction || isSecureRequest(req);
  const sameSite: CookieOptions["sameSite"] = secure ? "strict" : "lax";
  const domain =
    ENV.cookieDomain ||
    (req.hostname &&
      !LOCAL_HOSTS.has(req.hostname) &&
      !isIpAddress(req.hostname) &&
      req.hostname) ||
    undefined;

  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure,
    domain,
  };
}

export function getAccessCookieOptions(req: Request): CookieOptions {
  return {
    ...getSessionCookieOptions(req),
    maxAge: ACCESS_TOKEN_TTL_MS,
  };
}

export function getRefreshCookieOptions(req: Request): CookieOptions {
  return {
    ...getSessionCookieOptions(req),
    maxAge: REFRESH_TOKEN_TTL_MS,
  };
}

export function clearSessionCookies(res: Response, req: Request) {
  const baseOptions = { ...getSessionCookieOptions(req), maxAge: 0 };
  res.clearCookie(ACCESS_COOKIE_NAME, baseOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions);
}
