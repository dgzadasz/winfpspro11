import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { approveOrder } from "./orders";

export type DiscordUser = { id: string; username: string; displayName: string; avatar: string | null };
type RawRequest = Request & { rawBody?: Buffer };

const SESSION_COOKIE = "sk_discord_session";
const STATE_COOKIE = "sk_discord_oauth_state";
const DEFAULT_REDIRECT_URI = "https://skstore-m5ftihig.manus.space/api/discord/callback";
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || "a9c8eae26984fcb51b1e1c3ca0c50e2a6450ff2996e6285da743ce252dc9eac4";

function secret() { return process.env.JWT_SECRET || "sk-store-discord-session-development-secret"; }
function base64url(value: string | Buffer) { return Buffer.from(value).toString("base64url"); }
function hmac(value: string) { return crypto.createHmac("sha256", secret()).update(value).digest("base64url"); }
function redirectUri() { return process.env.DISCORD_REDIRECT_URI || DEFAULT_REDIRECT_URI; }
function secureCookie(req: Request) { return req.protocol === "https" || req.headers["x-forwarded-proto"] === "https"; }

function setCookie(res: Response, name: string, value: string, maxAge: number, secure: boolean) {
  const parts = [`${name}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax", "HttpOnly"];
  if (secure) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}
function clearCookie(res: Response, name: string, secure: boolean) { setCookie(res, name, "", 0, secure); }
function readCookie(req: Request, name: string) {
  const found = (req.headers.cookie || "").split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}
function checkoutPlan(req: Request) {
  const plan = readCookie(req, "sk_checkout_plan");
  return ["daily", "weekly", "monthly", "lifetime", "sensiNormal", "sensiPremium", "sensiEmulator"].includes(plan) ? plan : "";
}
function encodeSession(user: DiscordUser) {
  const payload = base64url(JSON.stringify({ ...user, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  return `${payload}.${hmac(payload)}`;
}
function decodeSession(value: string): DiscordUser | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = hmac(payload);
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DiscordUser & { exp?: number };
    if (!data.exp || data.exp < Date.now() || !data.id) return null;
    return { id: data.id, username: data.username, displayName: data.displayName, avatar: data.avatar ?? null };
  } catch { return null; }
}
export function getDiscordUser(req: Request) { return decodeSession(readCookie(req, SESSION_COOKIE)); }

function oauthError(res: Response, message: string, status = 502) {
  res.status(status).send(`<html lang="pt-BR"><meta charset="utf-8"><title>SK$ STORE</title><body style="font-family:Arial;background:#09080c;color:#fff;padding:48px"><h1>Não foi possível entrar com Discord.</h1><p>${message}</p><a href="/" style="color:#c68cff">Voltar para a loja</a></body></html>`);
}

export function registerDiscordRoutes(app: Express) {
  app.get("/api/discord/login", (_req, res) => {
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET || !process.env.DISCORD_GUILD_ID) return oauthError(res, "A integração Discord ainda não foi configurada.", 503);
    const state = crypto.randomBytes(32).toString("hex");
    setCookie(res, STATE_COOKIE, state, 600, true);
    const params = new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID, redirect_uri: redirectUri(), response_type: "code", scope: "identify guilds.members.read", state });
    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  });

  app.get("/api/discord/callback", async (req, res) => {
    const state = readCookie(req, STATE_COOKIE); clearCookie(res, STATE_COOKIE, secureCookie(req));
    if (!state || state !== String(req.query.state || "")) return oauthError(res, "A sessão de login expirou. Tente novamente.", 403);
    const code = String(req.query.code || "");
    if (!code) return oauthError(res, "O Discord não retornou um código de autorização.", 400);
    try {
      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID || "", client_secret: process.env.DISCORD_CLIENT_SECRET || "", grant_type: "authorization_code", code, redirect_uri: redirectUri() }) });
      if (!tokenResponse.ok) throw new Error("token exchange failed");
      const token = await tokenResponse.json() as { access_token?: string };
      if (!token.access_token) throw new Error("missing access token");
      const headers = { Authorization: `Bearer ${token.access_token}` };
      const userResponse = await fetch("https://discord.com/api/v10/users/@me", { headers });
      if (!userResponse.ok) throw new Error("user lookup failed");
      const user = await userResponse.json() as { id: string; username: string; global_name?: string | null; avatar?: string | null };
      const memberResponse = await fetch(`https://discord.com/api/v10/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`, { headers });
      if (memberResponse.status === 404) return res.redirect("/?discordError=not_member");
      if (!memberResponse.ok) throw new Error("guild membership lookup failed");
      setCookie(res, SESSION_COOKIE, encodeSession({ id: user.id, username: user.username, displayName: user.global_name || user.username, avatar: user.avatar ?? null }), 7 * 24 * 60 * 60, secureCookie(req));
      const plan = checkoutPlan(req);
      clearCookie(res, "sk_checkout_plan", secureCookie(req));
      res.redirect(plan ? `/checkout/${plan}` : "/");
    } catch (error) { console.error("[Discord OAuth] callback failed", error); oauthError(res, "Não foi possível validar sua conta Discord agora."); }
  });

  app.get("/api/discord/session", (req, res) => res.json({ user: getDiscordUser(req) }));
  app.post("/api/discord/logout", (req, res) => { clearCookie(res, SESSION_COOKIE, secureCookie(req)); res.json({ success: true }); });
}

function verifyInteraction(req: RawRequest) {
  const signature = req.header("X-Signature-Ed25519");
  const timestamp = req.header("X-Signature-Timestamp");
  if (!signature || !timestamp || !req.rawBody) return false;
  try {
    const keyDer = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(DISCORD_PUBLIC_KEY, "hex")]);
    const publicKey = crypto.createPublicKey({ key: keyDer, format: "der", type: "spki" });
    return crypto.verify(null, Buffer.concat([Buffer.from(timestamp), req.rawBody]), publicKey, Buffer.from(signature, "hex"));
  } catch { return false; }
}

export function registerDiscordInteractionRoute(app: Express) {
  app.post("/api/discord/interactions", async (req, res) => {
    const rawReq = req as RawRequest;
    if (!verifyInteraction(rawReq)) return res.status(401).send("invalid request signature");
    const interaction = req.body as { type?: number; data?: { custom_id?: string }; member?: { user?: { id?: string } }; channel_id?: string };
    if (interaction.type === 1) return res.json({ type: 1 });
    if (interaction.type !== 3) return res.json({ type: 4, data: { content: "Interação não suportada.", flags: 64 } });
    const actorId = interaction.member?.user?.id;
    const customId = interaction.data?.custom_id || "";
    const orderId = customId.startsWith("sk_approve:") ? customId.slice("sk_approve:".length) : "";
    if (!orderId || !actorId || actorId !== process.env.DISCORD_ADMIN_ID || interaction.channel_id !== process.env.DISCORD_LOG_CHANNEL_ID) return res.json({ type: 4, data: { content: "Você não tem permissão para confirmar este pedido.", flags: 64 } });
    try {
      const result = await approveOrder(orderId, actorId);
      return res.json({ type: 7, data: { content: `**SK$ STORE · PAGAMENTO CONFIRMADO**\nPedido: \`${result.orderId}\`\nCliente: **${result.discordName}**\nConfirmado por: <@${actorId}>`, components: [{ type: 1, components: [{ type: 2, style: 3, label: "Pagamento confirmado", custom_id: `sk_approved:${result.orderId}`, disabled: true }] }] } });
    } catch (error) { console.error("[Discord Interaction] approval failed", error); return res.json({ type: 4, data: { content: "Não foi possível confirmar este pedido.", flags: 64 } }); }
  });
}
