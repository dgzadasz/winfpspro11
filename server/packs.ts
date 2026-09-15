import { eq, sql } from "drizzle-orm";
import { discordOrders } from "../drizzle/schema";
import { getDb } from "./db";

export const PACK_FILES = {
  sensiNormal: "sensi-normal.zip",
  sensiPremium: "sensi-premium.zip",
  sensiEmulator: "sensi-emulator.zip",
} as const;

export type PackKey = keyof typeof PACK_FILES;

export async function hasApprovedPack(discordId: string, pack: PackKey) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(discordOrders).where(eq(discordOrders.discordId, discordId));
  const approved = rows.filter(order => order.plan === pack && order.status === "approved");
  if (!approved.length) return false;
  try {
    const licenses = await db.execute(sql`SELECT status, expires_at AS "expiresAt" FROM licenses WHERE discord_id = ${discordId} AND plan = ${pack}`);
    if (!licenses.rows.length) return true; // compatibility with approvals made before licenses existed
    const now = Date.now();
    return licenses.rows.some((license: any) => license.status === "ACTIVE" && (!license.expiresAt || new Date(license.expiresAt).getTime() > now));
  } catch {
    return true;
  }
}

export async function hasApprovedPremium(discordId: string) {
  return hasApprovedPack(discordId, "sensiPremium");
}

export function isPackKey(value: string): value is PackKey {
  return Object.prototype.hasOwnProperty.call(PACK_FILES, value);
}
