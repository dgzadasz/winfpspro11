import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let initializing: Promise<void> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (initializing) await initializing;
  if (!_db && process.env.DATABASE_URL) {
    const databaseUrl = process.env.DATABASE_URL;
    initializing = (async () => {
    try {
      _db = drizzle(databaseUrl);
      await _db.execute(sql`CREATE TABLE IF NOT EXISTS users (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "openId" varchar(64) NOT NULL UNIQUE, name text, email varchar(320), "loginMethod" varchar(64), role text NOT NULL DEFAULT 'user', "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "lastSignedIn" timestamp NOT NULL DEFAULT now())`);
      await _db.execute(sql`CREATE TABLE IF NOT EXISTS discord_orders (id varchar(32) PRIMARY KEY, "discordId" varchar(64) NOT NULL, "discordName" varchar(255) NOT NULL, plan varchar(32) NOT NULL, "planName" varchar(80) NOT NULL, "amountCents" integer NOT NULL, status text NOT NULL DEFAULT 'pending', "createdAt" timestamp NOT NULL DEFAULT now(), "approvedAt" timestamp, "notifiedAt" timestamp, "discordMessageId" varchar(64))`);
      await _db.execute(sql`ALTER TABLE discord_orders ADD COLUMN IF NOT EXISTS "deviceProfile" text`);
      await _db.execute(sql`CREATE INDEX IF NOT EXISTS discord_orders_discord_id_idx ON discord_orders ("discordId")`);
      await _db.execute(sql`CREATE TABLE IF NOT EXISTS catalog_products (id varchar(64) PRIMARY KEY, slug varchar(120) NOT NULL UNIQUE, name varchar(160) NOT NULL, category varchar(40) NOT NULL, short_description text NOT NULL, description text NOT NULL, price_cents integer NOT NULL, status varchar(24) NOT NULL DEFAULT 'available', tags jsonb NOT NULL DEFAULT '[]'::jsonb, compatibility jsonb NOT NULL DEFAULT '[]'::jsonb, included jsonb NOT NULL DEFAULT '[]'::jsonb, updated_at timestamp NOT NULL DEFAULT now())`);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
    })();
    await initializing;
    initializing = null;
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

    const textFields = ["name", "email", "loginMethod"] as const;
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

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
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

// TODO: add feature queries here as your schema grows.


