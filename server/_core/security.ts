import type { Express, Request } from "express";
import cors from "cors";
import helmet from "helmet";
import { ENV } from "./env";

export function applySecurityMiddleware(app: Express) {
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  const connectSources = ["'self'"];
  if (ENV.oAuthServerUrl) connectSources.push(ENV.oAuthServerUrl);
  if (ENV.forgeApiUrl) connectSources.push(ENV.forgeApiUrl);

  app.use(
    helmet({
      hsts: ENV.isProduction
        ? { maxAge: 63072000, includeSubDomains: true, preload: true }
        : undefined,
      contentSecurityPolicy: ENV.isDevelopment
        ? false
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: [
                "'self'",
                "https://checkout.infinity.com",
              ],
              styleSrc: [
                "'self'",
                "https://fonts.googleapis.com",
                "'unsafe-inline'",
              ],
              imgSrc: ["'self'", "data:", "blob:"],
              connectSrc: connectSources,
              frameSrc: ["'self'", "https://checkout.infinity.com"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              frameAncestors: ["'none'"],
            },
          },
      referrerPolicy: { policy: "no-referrer" },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-site" },
    })
  );

  const corsOptions = {
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin) return callback(null, true);
      if (ENV.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  };

  app.use(cors(corsOptions));
}
