import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { nanoid } from 'nanoid';
import { InsertUser, users, leads, InsertLead, Lead, subscriptions, orders, InsertOrder, InsertSubscription } from '../drizzle/schema';
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get user by email: database not available');
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(params: {
  email: string;
  passwordHash: string;
  name?: string | null;
}): Promise<InsertUser & { id?: number }> {
  const db = await getDb();
  const openId = `local:${nanoid(24)}`;
  const now = new Date();

  const values: InsertUser = {
    openId,
    email: params.email,
    passwordHash: params.passwordHash,
    name: params.name ?? null,
    loginMethod: 'password',
    lastSignedIn: now,
  };

  if (!db) {
    console.warn('[Database] Cannot create user: database not available');
    return values;
  }

  const result = await db.insert(users).values(values);
  return { ...values, id: result[0]?.insertId };
}

export async function createLead(data: InsertLead): Promise<Lead | null> {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot create lead: database not available');
    return null;
  }

  try {
    const result = await db.insert(leads).values(data);
    return { ...data, id: result[0].insertId } as Lead;
  } catch (error) {
    console.error('[Database] Failed to create lead:', error);
    throw error;
  }
}

export async function getLeads(): Promise<Lead[]> {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get leads: database not available');
    return [];
  }

  try {
    return await db.select().from(leads).orderBy(leads.createdAt);
  } catch (error) {
    console.error('[Database] Failed to get leads:', error);
    throw error;
  }
}

export async function updateUserToken(email: string, tokenData: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(tokenData).where(eq(users.email, email));
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.resetPasswordToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByVerificationToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.verificationToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrderByIdempotencyKey(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.idempotencyKey, key)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(orders).values(data);
  return { ...data, id: result[0].insertId };
}

export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(subscriptions).values(data);
  return { ...data, id: result[0].insertId };
}
