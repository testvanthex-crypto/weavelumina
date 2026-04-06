import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import pinoHttp from "pino-http";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";
import { applySecurityMiddleware } from "./security";
import { createRateLimiters } from "./rateLimiter";
import { ENV } from "./env";
import { handlePostPaymentAutomation } from "../services/automation";

export type CreateAppOptions = {
  useStatic?: boolean;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const rateLimiters = createRateLimiters();

  app.use(
    pinoHttp({
      level: ENV.isProduction ? "info" : "debug",
      redact: ["req.headers.authorization", "req.headers.cookie"],
    })
  );

  applySecurityMiddleware(app);

  // Tight JSON limits to avoid abuse; bump only for explicit upload routes.
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  app.use(rateLimiters.general);
  app.use("/api/trpc/auth.login", rateLimiters.auth);
  app.use("/api/trpc/auth.register", rateLimiters.signup);
  app.use("/api/trpc/payments.createOrder", rateLimiters.payment);

  // Webhook for Infinity Payment Gateway
  app.post("/api/webhooks/infinity", express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      // In production verify HMAC signature!
      const event = JSON.parse(req.body);
      if (event.type === "order.paid") {
         // Fake hook parsing for demonstration
         console.log(`[Webhook] Order ${event.orderId} Paid! Starting automation...`);
         // Trigger PDF and email delivery async without blocking webhook response
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
      createContext,
    })
  );

  if (options.useStatic && !ENV.isDevelopment) {
    serveStatic(app);
  }

  return app;
}
