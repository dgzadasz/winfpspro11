import crypto from "node:crypto";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { discordOrders } from "../drizzle/schema";
import type { DiscordUser } from "./discord";
import { getDb } from "./db";

export const PLANS = {
  daily: { name: "Daily Pass", duration: "1 dia de acesso", amountCents: 1000, days: 1 },
  weekly: { name: "Weekly Pass", duration: "7 dias de acesso", amountCents: 4000, days: 7 },
  monthly: { name: "Monthly Pass", duration: "30 dias de acesso", amountCents: 12000, days: 30 },
  lifetime: { name: "Lifetime", duration: "Acesso vitalício", amountCents: 30000, days: 0 },
} as const;

export type PlanKey = keyof typeof PLANS;

function tlv(tag: string, value: string) {
  return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

function clean(value: string, limit: number) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").toUpperCase().slice(0, limit);
}

export function pixPayload(order: { id: string; plan: PlanKey }) {
  const plan = PLANS[order.plan];
  const key = process.env.PIX_KEY || "88b1eaac-4da0-4665-a327-095cb7a86b35";
  const data = tlv("00", "01")
    + tlv("26", tlv("00", "BR.GOV.BCB.PIX") + tlv("01", key))
    + tlv("52", "0000") + tlv("53", "986")
    + tlv("54", (plan.amountCents / 100).toFixed(2))
    + tlv("58", "BR") + tlv("59", clean(process.env.PIX_NAME || "DIEGO", 25))
    + tlv("60", clean(process.env.PIX_CITY || "SAO PAULO", 15))
    + tlv("62", tlv("05", order.id)) + "6304";
  let crc = 0xffff;
  const bytes = Buffer.from(data);
  for (let index = 0; index < bytes.length; index++) {
    const byte = bytes[index];
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return `${data}${crc.toString(16).toUpperCase().padStart(4, "0")}`;
}

async function postToDiscord(content: string) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return false;
  const response = await fetch(`${webhook}?wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
  });
  return response.ok;
}

export async function createOrder(user: DiscordUser, planKey: PlanKey) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const plan = PLANS[planKey];
  const id = crypto.randomBytes(10).toString("hex").toUpperCase();
  await db.insert(discordOrders).values({
    id,
    discordId: user.id,
    discordName: user.displayName,
    plan: planKey,
    planName: plan.name,
    amountCents: plan.amountCents,
    status: "pending",
  });
  let notified = false;
  try {
    notified = await postToDiscord([
      "**SK$ STORE · NOVO PEDIDO**",
      `Pedido: \`${id}\``,
      `Cliente: **${user.displayName}** (Discord ID \`${user.id}\`)`,
      `Plano: **${plan.name}** · R$ ${(plan.amountCents / 100).toFixed(2).replace(".", ",")}`,
      "Status: **Aguardando conferência manual do Pix**",
      "A aprovação não é automática. Confira o recebimento no banco antes de aprovar.",
    ].join("\n"));
  } catch (error) {
    console.error("[Discord] order notification failed", error);
  }
  if (notified) await db.update(discordOrders).set({ notifiedAt: new Date() }).where(eq(discordOrders.id, id));
  return { id, plan: planKey, planName: plan.name, amountCents: plan.amountCents, pix: pixPayload({ id, plan: planKey }), notified };
}

export async function getOrdersForUser(discordId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discordOrders).where(eq(discordOrders.discordId, discordId)).orderBy(desc(discordOrders.createdAt));
}

export async function getDiscordAdminOrders() {
  return getPendingOrders();
}

export async function getPendingOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discordOrders).where(or(eq(discordOrders.status, "pending"), isNull(discordOrders.notifiedAt))).orderBy(desc(discordOrders.createdAt));
}

export async function approveOrder(orderId: string, adminId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(discordOrders).where(eq(discordOrders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) throw new Error("Order not found");
  if (order.status === "pending") {
    await db.update(discordOrders).set({ status: "approved", approvedAt: new Date() }).where(and(eq(discordOrders.id, orderId), eq(discordOrders.status, "pending")));
    try {
      await postToDiscord(`**SK$ STORE · PAGAMENTO CONFIRMADO MANUALMENTE**\nPedido: \`${order.id}\`\nCliente: **${order.discordName}** (Discord ID \`${order.discordId}\`)\nAprovado pelo administrador \`${adminId}\`.\nO download só será liberado quando o APK estiver disponível.`);
    } catch (error) {
      console.error("[Discord] approval notification failed", error);
    }
  }
  return { success: true, orderId };
}
