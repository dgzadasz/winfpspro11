import { eq } from "drizzle-orm";
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
  return rows.some(order => order.plan === pack && order.status === "approved");
}

export async function hasApprovedPremium(discordId: string) {
  return hasApprovedPack(discordId, "sensiPremium");
}

export function isPackKey(value: string): value is PackKey {
  return Object.prototype.hasOwnProperty.call(PACK_FILES, value);
}
