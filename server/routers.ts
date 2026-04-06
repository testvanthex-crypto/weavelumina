import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { createLead, createLocalUser, getLeads, getUserByEmail, upsertUser, updateUserToken, getUserByResetToken, getUserByVerificationToken, getOrderByIdempotencyKey, createOrder, createSubscription } from "./db";
import { generateSecureToken, generateTokenExpiry } from "./auth/tokens";
import { notifyOwner } from "./_core/notification";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
// Mock Infinity payment gateway
class Infinity {
  constructor(config: any) {}
  orders = {
    create: async (data: any) => ({
      id: `mock_order_${Date.now()}`,
      currency: data.currency || "USD"
    })
  };
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      const { passwordHash, ...safeUser } = ctx.user;
      return safeUser;
    }),
    verifyEmail: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const user = await getUserByVerificationToken(input.token);
        if (!user || !user.verificationTokenExpires || user.verificationTokenExpires.getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired token" });
        }
        await updateUserToken(user.email!, {
          isEmailVerified: true,
          verificationToken: null,
          verificationTokenExpires: null,
        });
        return { success: true };
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (user) {
          const token = generateSecureToken();
          await updateUserToken(input.email, {
            resetPasswordToken: token,
            resetPasswordExpires: generateTokenExpiry(15),
          });
          console.log(`[Email Mock] Password reset link for ${input.email}: /reset-password?token=${token}`);
        }
        return { success: true };
      }),
    resetPassword: publicProcedure
      .input(z.object({ token: z.string(), password: z.string().min(8) }))
      .mutation(async ({ input }) => {
        const user = await getUserByResetToken(input.token);
        if (!user || !user.resetPasswordExpires || user.resetPasswordExpires.getTime() < Date.now()) {
           throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset token" });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        await updateUserToken(user.email!, {
          passwordHash,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        });
        return { success: true };
      }),
    register: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(120).optional(),
        email: z.string().email(),
        password: z.string().min(8).max(100),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already registered.",
          });
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const user = await createLocalUser({
          email: input.email,
          passwordHash,
          name: input.name ?? null,
        });

        const vToken = generateSecureToken();
        await updateUserToken(input.email, {
          verificationToken: vToken,
          verificationTokenExpires: generateTokenExpiry(60),
        });
        console.log(`[Email Mock] Verify email for ${input.email}: /verify-email?token=${vToken}`);

        await sdk.issueSessionForUser(user as any, ctx.req, ctx.res);

        const { passwordHash: _, ...safeUser } = user;
        return { user: safeUser };
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8).max(100),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }

        await upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });

        await sdk.issueSessionForUser(user as any, ctx.req, ctx.res);

        const { passwordHash: _, ...safeUser } = user;
        return { user: safeUser };
      }),
    logout: protectedProcedure.mutation(({ ctx }) => {
      sdk.logout(ctx.user, ctx.req, ctx.res);
      return { success: true } as const;
    }),
  }),

  payments: router({
    createOrder: protectedProcedure
      .input(z.object({
        plan: z.enum(["Spark Starter", "Business Booster", "Growth Accelerator"]),
        idempotencyKey: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const existingOrder = await getOrderByIdempotencyKey(input.idempotencyKey);
        if (existingOrder) {
          return {
            orderId: existingOrder.gatewayOrderId,
            amount: existingOrder.amount,
            currency: existingOrder.currency,
            keyId: ENV.infinityKeyId,
          };
        }

        const priceMap: Record<string, number> = {
          "Spark Starter": 79900,
          "Business Booster": 159900,
          "Growth Accelerator": 199900,
        };
        const amount = priceMap[input.plan] ?? 0;

        if (!ENV.infinityKeyId || !ENV.infinityKeySecret) {
          // Log explicitly for dev fallback
          console.warn("[Payments] Infinity not fully configured, falling back to mock response.");
        }

        const infinity = new Infinity({
          key_id: ENV.infinityKeyId,
          key_secret: ENV.infinityKeySecret,
        });

        const gatewayOrder = await infinity.orders.create({
          amount,
          currency: "USD",
          receipt: `lw_${Date.now()}`,
        });

        // Store standard order
        await createOrder({
          userId: ctx.user.id,
          idempotencyKey: input.idempotencyKey,
          gatewayOrderId: gatewayOrder.id,
          amount,
          currency: gatewayOrder.currency,
          status: "pending",
        });

        // Store subscription intention
        await createSubscription({
          userId: ctx.user.id,
          planId: input.plan,
          status: "active", // In a real flow, this goes 'active' after webhook
        });

        return {
          orderId: gatewayOrder.id,
          amount,
          currency: gatewayOrder.currency,
          keyId: ENV.infinityKeyId,
        };
      }),
  }),

  leads: router({
    create: publicProcedure
      .input(z.object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        email: z.string().email(),
        plan: z.string().min(1),
        message: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const lead = await createLead({
          firstName: input.firstName,
          lastName: input.lastName || null,
          email: input.email,
          plan: input.plan,
          message: input.message || null,
          status: 'new',
        });
        
        // Notify owner of new lead
        await notifyOwner({
          title: 'New Lead Submission',
          content: `${input.firstName} ${input.lastName || ''} (${input.email}) is interested in ${input.plan}. Message: ${input.message || 'N/A'}`,
        });
        
        return lead;
      }),
    list: protectedProcedure.query(async () => {
      return await getLeads();
    }),
  }),
});

export type AppRouter = typeof appRouter;
