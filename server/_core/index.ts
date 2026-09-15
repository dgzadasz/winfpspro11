import "dotenv/config";
import { registerReviewRoutes } from "../reviews";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerDiscordInteractionRoute, registerDiscordRoutes, getDiscordUser } from "../discord";
import { cancelOrder, createOrder, getOrderForUser, getOrdersForUser, PLANS } from "../orders";
import { validDeviceProfile } from "../../shared/devices";
import { personalizedPack, deviceGuide, emulatorGuide } from "../pack-archive";
import { PACK_FILES, hasApprovedPack, hasApprovedPremium, isPackKey } from "../packs";
import { recommendSensitivity } from "../sensi-ai";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { CATALOG } from "../../shared/catalog";
import { catalogProducts } from "../../drizzle/schema";
import { getDb } from "../db";
import { serveStatic, setupVite } from "./vite";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { selectOwnedPack } from "../pack-access";
import { registerSupportRoutes } from "../support";
import { registerAnalyticsRoutes } from "../analytics";

function isPortAvailable(port: number): Promise<boolean> { return new Promise(resolve => { const server = net.createServer(); server.listen(port, () => server.close(() => resolve(true))); server.on("error", () => resolve(false)); }); }
async function findAvailablePort(startPort = 3000): Promise<number> { for (let port = startPort; port < startPort + 20; port++) if (await isPortAvailable(port)) return port; throw new Error(`No available port found starting from ${startPort}`); }

async function startServer() {
  if (process.env.NODE_ENV === "production" && (process.env.JWT_SECRET?.length || 0) < 32) {
    throw new Error("Configure JWT_SECRET with at least 32 characters before starting production.");
  }
  const app = express();
  const aiRequests = new Map<string, { count: number; resetAt: number }>();
  app.disable("x-powered-by");
  app.use((_req, res, next) => { res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("X-Frame-Options", "SAMEORIGIN"); res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin"); res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()"); next(); });
  app.use((req, res, next) => { const requestId = randomUUID(); res.setHeader("X-Request-Id", requestId); const started = Date.now(); res.on("finish", () => console.info(`[http] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms ${requestId}`)); next(); });
  const server = createServer(app);
  registerDiscordInteractionRoute(app);
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/payment/mode", (_req, res) => res.json({ mode: "manual", automaticGatewayConfigured: false, confirmation: "discord_admin" }));
  app.get("/api/catalog", async (_req, res) => { try { const db = await getDb(); const products = db ? await db.select().from(catalogProducts) : CATALOG; return res.json({ products, categories: Array.from(new Set(products.map(product => product.category))) }); } catch (error) { console.error("[Catalog] read failed", error); return res.json({ products: CATALOG, categories: Array.from(new Set(CATALOG.map(product => product.category))) }); } });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerDiscordRoutes(app);
  registerReviewRoutes(app);
  registerSupportRoutes(app);
  registerAnalyticsRoutes(app);
  app.get("/api/store/orders", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: "discord_login_required" });
    return res.json({ orders: await getOrdersForUser(user.id) });
  });
  app.get("/api/store/licenses", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: "discord_login_required" });
    try { const db = await getDb(); if (!db) return res.status(503).json({ error: "licenses_unavailable" }); const result = await db.execute(sql`SELECT id, order_id AS "orderId", plan, status, created_at AS "createdAt", expires_at AS "expiresAt" FROM licenses WHERE discord_id = ${user.id} ORDER BY created_at DESC`); res.setHeader("Cache-Control", "private, no-store"); return res.json({ licenses: result.rows }); } catch (error) { console.error("[Licenses] read failed", error); return res.status(503).json({ error: "licenses_unavailable" }); }
  });
  app.post("/api/admin/licenses/:id/revoke", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user || !process.env.DISCORD_ADMIN_ID || user.id !== process.env.DISCORD_ADMIN_ID) return res.status(403).json({ error: "admin_required" });
    try {
      const db = await getDb(); if (!db) return res.status(503).json({ error: "licenses_unavailable" });
      const result = await db.execute(sql`UPDATE licenses SET status = 'REVOKED' WHERE id = ${req.params.id} AND status <> 'REVOKED' RETURNING id`);
      if (!result.rows.length) return res.status(404).json({ error: "license_not_found" });
      console.info(`[audit] license_revoked ${String(req.params.id).slice(0, 40)} by ${user.id}`);
      return res.json({ success: true, status: "REVOKED" });
    } catch { return res.status(503).json({ error: "license_update_failed" }); }
  });
  app.get("/api/store/orders/:id", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: "discord_login_required" });
    const order = await getOrderForUser(req.params.id, user.id);
    if (!order) return res.status(404).json({ error: "order_not_found" });
    return res.json({ order });
  });
  app.post("/api/store/orders", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: "discord_login_required" });
    const plan = String(req.body?.plan || "");
    if (!Object.hasOwn(PLANS, plan)) return res.status(400).json({ error: "invalid_plan" });
    if (!isPackKey(plan)) return res.status(409).json({ error: "As chaves estarão disponíveis em breve." });
    const profile = req.body?.deviceProfile;
    if (plan !== "sensiEmulator" && !validDeviceProfile(profile)) return res.status(400).json({ error: "Selecione a marca, o modelo, o jogo e sua preferência." });
    try { return res.status(201).json({ order: await createOrder(user, plan, plan === "sensiEmulator" ? undefined : profile) }); }
    catch (error) { console.error("[Orders] create failed", error); return res.status(503).json({ error: "orders_unavailable" }); }
  });
  app.post("/api/store/orders/:id/cancel", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: "discord_login_required" });
    try { return res.json(await cancelOrder(req.params.id, user.id)); }
    catch (error) { return res.status(409).json({ error: error instanceof Error ? error.message : "order_cancel_failed" }); }
  });
    app.get("/api/packs/:pack/download", async (req, res) => {
    const user = getDiscordUser(req);
    const pack = req.params.pack;
    if (!user) return res.status(401).json({ error: "discord_login_required" });
    if (!isPackKey(pack) || !(await hasApprovedPack(user.id, pack))) return res.status(403).json({ error: "pack_purchase_required" });
    const orders = await getOrdersForUser(user.id);
    const owned = selectOwnedPack(orders, user.id, pack, req.query.order);
    if (!owned) return res.status(403).json({error:"pack_purchase_required"});
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (owned.deviceProfile && pack !== "sensiEmulator") {
      try { const profile = JSON.parse(owned.deviceProfile); if (validDeviceProfile(profile)) return res.type("application/zip").attachment(PACK_FILES[pack]).send(personalizedPack(profile, pack === "sensiPremium")); }
      catch { return res.status(503).json({error:"Não foi possível preparar seu ZIP. Tente novamente."}); }
    }
    return res.download(path.resolve(process.cwd(), "server/private-packs", PACK_FILES[pack]), PACK_FILES[pack]);
    });
    app.get("/api/packs/:pack/guide", async (req, res) => {
      const user = getDiscordUser(req); const pack = req.params.pack;
      if (!user || !isPackKey(pack)) return res.status(401).send("Conecte-se com Discord para abrir seu guia.");
      const orders = await getOrdersForUser(user.id); const owned = selectOwnedPack(orders, user.id, pack, req.query.order);
      if (!owned) return res.status(403).send("Este guia só fica disponível após a aprovação da compra.");
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      if (pack === "sensiEmulator") return res.type("html").send(emulatorGuide());
      try { const profile = owned.deviceProfile ? JSON.parse(owned.deviceProfile) : null; return res.type("html").send(validDeviceProfile(profile) ? deviceGuide(profile) : "<h1>Perfil não encontrado</h1><p>Fale com o suporte para atualizar seu pedido.</p>"); }
      catch { return res.status(503).send("Não foi possível abrir o guia."); }
    });
  app.post("/api/premium-ai", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: "discord_login_required" });
    if (!(await hasApprovedPremium(user.id))) return res.status(403).json({ error: "premium_pack_required" });
    const now = Date.now(); const bucket = aiRequests.get(user.id); const current = bucket && bucket.resetAt > now ? bucket : { count: 0, resetAt: now + 60_000 }; if (current.count >= 20) return res.status(429).json({ error: "ai_rate_limited", retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) }); current.count += 1; aiRequests.set(user.id, current);
    const { device = "", refreshRate = "", style = "", game = "" } = req.body || {};
    if ([device, refreshRate, style, game].some(value => typeof value !== "string" || value.trim().length === 0)) return res.status(400).json({ error: "missing_fields" });
      try { return res.json({ recommendation: await recommendSensitivity({ device, refreshRate, style, game }) }); }
      catch (error) { console.error("[Premium AI] failed", error); return res.status(503).json({ error: "ai_unavailable", detail: error instanceof Error ? error.message : "Provedor indisponível" }); }
  });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => { if (res.headersSent) return next(error); const requestId = res.getHeader("X-Request-Id"); console.error("[http] unhandled error", { requestId, method: req.method, path: req.path, error }); res.status(500).json({ error: "internal_server_error", requestId }); });
  if (process.env.NODE_ENV === "development") await setupVite(app, server); else serveStatic(app);
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  server.listen(port, () => console.log(`Server running on http://localhost:${port}/`));
}
startServer().catch(error => { console.error(error); process.exitCode = 1; });
