import crypto from "node:crypto";
import type { Express, Request, Response } from "express";

export type DiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

const SESSION_COOKIE = "sk_discord_session";
const STATE_COOKIE = "sk_discord_oauth_state";
const DEFAULT_REDIRECT_URI = "https://skstore-m5ftihig.manus.space/api/discord/callback";

function secret() {
  return process.env.JWT_SECRET || "sk-store-discord-session-development-secret";
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function hmac(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function redirectUri() {
  return process.env.DISCORD_REDIRECT_URI || DEFAULT_REDIRECT_URI;
}

function secureCookie(req: Request) {
  return req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";
}

function setCookie(res: Response, name: string, value: string, maxAge: number, secure: boolean) {
  const parts = [`${name}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax", "HttpOnly"];
  if (secure) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

function clearCookie(res: Response, name: string, secure: boolean) {
  setCookie(res, name, "", 0, secure);
}

function readCookie(req: Request, name: string) {
  const header = req.headers.cookie || "";
  const found = header.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}

function encodeSession(user: DiscordUser) {
  const payload = base64url(JSON.stringify({ ...user, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  return `${payload}.${hmac(payload)}`;
}

function decodeSession(value: string): DiscordUser | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = hmac(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DiscordUser & { exp?: number };
    if (!data.exp || data.exp < Date.now() || !data.id) return null;
    return { id: data.id, username: data.username, displayName: data.displayName, avatar: data.avatar ?? null };
  } catch {
    return null;
  }
}

export function getDiscordUser(req: Request) {
  return decodeSession(readCookie(req, SESSION_COOKIE));
}

function oauthError(res: Response, message: string, status = 502) {
  res.status(status).send(`<html lang="pt-BR"><meta charset="utf-8"><title>SK$ STORE</title><body style="font-family:Arial;background:#09080c;color:#fff;padding:48px"><h1>Não foi possível entrar com Discord.</h1><p>${message}</p><a href="/" style="color:#c68cff">Voltar para a loja</a></body></html>`);
}

export function registerDiscordRoutes(app: Express) {
  app.get("/api/discord/login", (_req, res) => {
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET || !process.env.DISCORD_GUILD_ID) {
      oauthError(res, "A integração Discord ainda não foi configurada.", 503);
      return;
    }
    const state = crypto.randomBytes(32).toString("hex");
    setCookie(res, STATE_COOKIE, state, 600, true);
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: "identify guilds.members.read",
      state,
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  });

  app.get("/api/discord/callback", async (req, res) => {
    const state = readCookie(req, STATE_COOKIE);
    clearCookie(res, STATE_COOKIE, secureCookie(req));
    if (!state || state !== String(req.query.state || "")) {
      oauthError(res, "A sessão de login expirou. Tente novamente.", 403);
      return;
    }
    const code = String(req.query.code || "");
    if (!code) {
      oauthError(res, "O Discord não retornou um código de autorização.", 400);
      return;
    }
    try {
      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID || "",
          client_secret: process.env.DISCORD_CLIENT_SECRET || "",
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri(),
        }),
      });
      if (!tokenResponse.ok) throw new Error("token exchange failed");
      const token = await tokenResponse.json() as { access_token?: string };
      if (!token.access_token) throw new Error("missing access token");
      const headers = { Authorization: `Bearer ${token.access_token}` };
      const userResponse = await fetch("https://discord.com/api/v10/users/@me", { headers });
      if (!userResponse.ok) throw new Error("user lookup failed");
      const user = await userResponse.json() as { id: string; username: string; global_name?: string | null; avatar?: string | null };
      const memberResponse = await fetch(`https://discord.com/api/v10/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`, { headers });
      if (memberResponse.status === 404) {
        res.redirect("/?discordError=not_member");
        return;
      }
      if (!memberResponse.ok) throw new Error("guild membership lookup failed");
      const sessionUser: DiscordUser = {
        id: user.id,
        username: user.username,
        displayName: user.global_name || user.username,
        avatar: user.avatar ?? null,
      };
      setCookie(res, SESSION_COOKIE, encodeSession(sessionUser), 7 * 24 * 60 * 60, secureCookie(req));
      res.redirect("/");
    } catch (error) {
      console.error("[Discord OAuth] callback failed", error);
      oauthError(res, "Não foi possível validar sua conta Discord agora.");
    }
  });

  app.get("/api/discord/session", (req, res) => {
    res.json({ user: getDiscordUser(req) });
  });

  app.post("/api/discord/logout", (req, res) => {
    clearCookie(res, SESSION_COOKIE, secureCookie(req));
    res.json({ success: true });
  });
}
