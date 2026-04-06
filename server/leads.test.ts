import { describe, expect, it, beforeEach, vi } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('leads.create', () => {
  it('should create a lead with valid input', async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.leads.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      plan: 'Growth Accelerator',
      message: 'I want to build a website',
    });

    expect(result).toBeDefined();
    expect(result?.firstName).toBe('John');
    expect(result?.lastName).toBe('Doe');
    expect(result?.email).toBe('john@example.com');
    expect(result?.plan).toBe('Growth Accelerator');
    expect(result?.status).toBe('new');
  });

  it('should create a lead without optional fields', async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.leads.create({
      firstName: 'Jane',
      email: 'jane@example.com',
      plan: 'Spark Starter',
    });

    expect(result).toBeDefined();
    expect(result?.firstName).toBe('Jane');
    expect(result?.lastName).toBeNull();
    expect(result?.message).toBeNull();
    expect(result?.status).toBe('new');
  });

  it('should reject invalid email', async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leads.create({
        firstName: 'John',
        email: 'invalid-email',
        plan: 'Growth Accelerator',
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('Invalid email');
    }
  });

  it('should reject empty firstName', async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leads.create({
        firstName: '',
        email: 'john@example.com',
        plan: 'Growth Accelerator',
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it('should reject empty plan', async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leads.create({
        firstName: 'John',
        email: 'john@example.com',
        plan: '',
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });
});

describe('leads.list', () => {
  it('should require authentication to list leads', async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leads.list();
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.code).toBe('UNAUTHORIZED');
    }
  });

  it('should return leads for authenticated users', async () => {
    const user: AuthenticatedUser = {
      id: 1,
      openId: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      loginMethod: 'manus',
      passwordHash: null,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx: TrpcContext = {
      user,
      req: {
        protocol: 'https',
        headers: {},
      } as TrpcContext['req'],
      res: {
        clearCookie: () => {},
      } as TrpcContext['res'],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.leads.list();

    expect(Array.isArray(result)).toBe(true);
  });
});
