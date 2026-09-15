import type { DeviceProfile } from "../shared/devices";
import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { discordOrders } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import type { DiscordUser } from "./discord";
import { getDb } from "./db";

export const PLANS = {
  daily: { name: "Daily Pass", duration: "1 dia de acesso", amountCents: 1000, days: 1 },
  weekly: { name: "Weekly Pass", duration: "7 dias de acesso", amountCents: 4000, days: 7 },
  monthly: { name: "Monthly Pass", duration: "30 dias de acesso", amountCents: 12000, days: 30 },
  lifetime: { name: "Lifetime", duration: "Acesso vitalício", amountCents: 30000, days: 0 },
  sensiNormal: { name: "Pack Sensi Normal", duration: "Android e iPhone", amountCents: 1990, days: 0 },
  sensiPremium: { name: "Pack Sensi Premium", duration: "Presets exclusivos + IA", amountCents: 3990, days: 0 },
  sensiEmulator: { name: "Pack Sensi Emulador", duration: "Configuração para PC", amountCents: 2990, days: 0 },
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
  const key = process.env.PIX_KEY?.trim();
  if (!key) throw new Error("PIX_KEY is not configured");
  const data = tlv("00", "01") + tlv("26", tlv("00", "BR.GOV.BCB.PIX") + tlv("01", key))
    + tlv("52", "0000") + tlv("53", "986") + tlv("54", (plan.amountCents / 100).toFixed(2))
    + tlv("58", "BR") + tlv("59", clean(process.env.PIX_NAME || "DIEGO", 25))
    + tlv("60", clean(process.env.PIX_CITY || "SAO PAULO", 15)) + tlv("62", tlv("05", order.id)) + "6304";
  let crc = 0xffff;
  const bytes = Buffer.from(data);
  for (let index = 0; index < bytes.length; index++) {
    const byte = bytes[index];
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return `${data}${crc.toString(16).toUpperCase().padStart(4, "0")}`;
}

export async function pixQrDataUrl(order: { id: string; plan: PlanKey }) {
  return QRCode.toDataURL(pixPayload(order), { errorCorrectionLevel: "M", margin: 2, width: 420 });
}

async function postBotMessage(order: { id: string; plan: PlanKey; discordName: string; discordId: string; deviceProfile?: DeviceProfile }) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_LOG_CHANNEL_ID;
  if (!token || !channelId) return null;
  const plan = PLANS[order.plan];
  const qrBuffer = await QRCode.toBuffer(pixPayload(order), { errorCorrectionLevel: "M", margin: 2, width: 600 });
  const payload = {
    content: "**SK$ STORE · NOVO PEDIDO**",
    embeds: [{
      title: "Pedido aguardando confirmação manual",
      color: 0xA45DF0,
      fields: [
        { name: "Pedido", value: `\`${order.id}\``, inline: true },
        { name: "Plano", value: `${plan.name} · R$ ${(plan.amountCents / 100).toFixed(2).replace(".", ",")}`, inline: true },
        { name: "Cliente Discord", value: `${order.discordName} · \`${order.discordId}\`` },
        ...(order.deviceProfile ? [{ name: "Perfil escolhido", value: `${order.deviceProfile.brand} ${order.deviceProfile.model} · ${order.deviceProfile.game}` }] : []),
        { name: "Pix", value: "Confira o recebimento no banco antes de confirmar." },
      ],
      image: { url: "attachment://pix.png" },
      footer: { text: "A confirmação é manual e só pode ser feita neste canal." },
    }],
    components: [{ type: 1, components: [{ type: 2, style: 3, label: "Confirmar pagamento", custom_id: `sk_approve:${order.id}` }, { type: 2, style: 4, label: "Cancelar pedido", custom_id: `sk_cancel:${order.id}` }] }],
  };
  const form = new FormData();
  form.append("payload_json", JSON.stringify(payload));
  form.append("files[0]", new Blob([new Uint8Array(qrBuffer)], { type: "image/png" }), "pix.png");
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST", headers: { Authorization: `Bot ${token}` }, body: form,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    console.error("[Discord Bot] failed to publish order", response.status, await response.text());
    return null;
  }
  return await response.json() as { id: string };
}

export async function createOrder(user: DiscordUser, planKey: PlanKey, deviceProfile?: DeviceProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const plan = PLANS[planKey];
  const id = crypto.randomBytes(10).toString("hex").toUpperCase();
  // Prepare payment before persisting: invalid configuration must not create an orphan order.
  const pix = pixPayload({ id, plan: planKey });
  const qr = await pixQrDataUrl({ id, plan: planKey });
  await db.insert(discordOrders).values({ id, discordId: user.id, discordName: user.displayName, plan: planKey, planName: plan.name, amountCents: plan.amountCents, deviceProfile: deviceProfile ? JSON.stringify(deviceProfile) : null, status: "pending" });
  let messageId: string | null = null;
  try {
    const message = await postBotMessage({ id, plan: planKey, discordName: user.displayName, discordId: user.id, deviceProfile });
    messageId = message?.id || null;
  } catch (error) {
    console.error("[Discord Bot] order notification failed", error);
  }
  if (messageId) await db.update(discordOrders).set({ notifiedAt: new Date(), discordMessageId: messageId }).where(eq(discordOrders.id, id));
  return { id, plan: planKey, planName: plan.name, amountCents: plan.amountCents, pix, qr, notified: Boolean(messageId) };
}

export async function getOrdersForUser(discordId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discordOrders).where(eq(discordOrders.discordId, discordId)).orderBy(desc(discordOrders.createdAt));
}

export async function getOrderForUser(orderId: string, discordId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(discordOrders).where(and(eq(discordOrders.id, orderId), eq(discordOrders.discordId, discordId))).limit(1);
  const order = rows[0];
  if (!order) return null;
  return { ...order, notified: Boolean(order.discordMessageId), pix: pixPayload({ id: order.id, plan: order.plan as PlanKey }), qr: await pixQrDataUrl({ id: order.id, plan: order.plan as PlanKey }) };
}

export async function getPendingOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discordOrders).where(eq(discordOrders.status, "pending")).orderBy(desc(discordOrders.createdAt));
}

export async function getDiscordAdminOrders() { return getPendingOrders(); }

export async function approveOrder(orderId: string, adminId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(discordOrders).where(eq(discordOrders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) throw new Error("Order not found");
  if (order.status === "cancelled") throw new Error("Order cancelled");
  if (order.status === "pending") await db.update(discordOrders).set({ status: "approved", approvedAt: new Date() }).where(and(eq(discordOrders.id, orderId), eq(discordOrders.status, "pending")));
  const latest = await db.select().from(discordOrders).where(eq(discordOrders.id, orderId)).limit(1);
  if (latest[0]?.status !== "approved") throw new Error("Order was cancelled concurrently");
  const durationDays = PLANS[order.plan as PlanKey].days;
  const expiresAt = durationDays ? new Date(Date.now() + durationDays * 86400000) : null;
  const licenseId = `SK-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
  await db.execute(sql`INSERT INTO licenses (id, order_id, discord_id, plan, status, expires_at) VALUES (${licenseId}, ${order.id}, ${order.discordId}, ${order.plan}, 'ACTIVE', ${expiresAt}) ON CONFLICT (order_id) DO NOTHING`);
  return { success: true, orderId, planName: order.planName, discordName: order.discordName, adminId };
}

export async function cancelOrder(orderId: string, discordId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(discordOrders).where(and(eq(discordOrders.id, orderId), eq(discordOrders.discordId, discordId))).limit(1);
  const order = rows[0];
  if (!order) throw new Error("Order not found");
  if (order.status === "approved") throw new Error("Order already approved");
  if (order.status === "pending") await db.update(discordOrders).set({ status: "cancelled" }).where(and(eq(discordOrders.id, orderId), eq(discordOrders.discordId, discordId), eq(discordOrders.status, "pending")));
  const latest = await db.select().from(discordOrders).where(eq(discordOrders.id, orderId)).limit(1);
  if (latest[0]?.status !== "cancelled") throw new Error("Order already approved");
  return { success: true, orderId };
}

export async function cancelOrderByAdmin(orderId: string, adminId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(discordOrders).where(eq(discordOrders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) throw new Error("Order not found");
  if (order.status === "approved") throw new Error("Order already approved");
  if (order.status === "pending") await db.update(discordOrders).set({ status: "cancelled" }).where(and(eq(discordOrders.id, orderId), eq(discordOrders.status, "pending")));
  const latest = await db.select().from(discordOrders).where(eq(discordOrders.id, orderId)).limit(1);
  if (latest[0]?.status !== "cancelled") throw new Error("Order already approved");
  return { success: true, orderId, adminId };
}
