import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerDiscordInteractionRoute, registerDiscordRoutes, getDiscordUser } from "../discord";
import { createOrder, getOrdersForUser, PLANS } from "../orders";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

type RawRequest = express.Request & { rawBody?: Buffer };
function isPortAvailable(port: number): Promise<boolean> { return new Promise(resolve => { const server = net.createServer(); server.listen(port, () => server.close(() => resolve(true))); server.on("error", () => resolve(false)); }); }
async function findAvailablePort(startPort = 3000): Promise<number> { for (let port = startPort; port < startPort + 20; port++) if (await isPortAvailable(port)) return port; throw new Error(`No available port found starting from ${startPort}`); }

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "50mb", verify: (req, _res, buffer) => { if ((req as express.Request).originalUrl.startsWith("/api/discord/interactions")) (req as RawRequest).rawBody = Buffer.from(buffer); } }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerDiscordRoutes(app);
  registerDiscordInteractionRoute(app);
  app.get("/api/store/orders", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: "discord_login_required" });
    return res.json({ orders: await getOrdersForUser(user.id) });
  });
  app.post("/api/store/orders", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: "discord_login_required" });
    const plan = String(req.body?.plan || "");
    if (!(plan in PLANS)) return res.status(400).json({ error: "invalid_plan" });
    try { return res.status(201).json({ order: await createOrder(user, plan as keyof typeof PLANS) }); }
    catch (error) { console.error("[Orders] create failed", error); return res.status(503).json({ error: "orders_unavailable" }); }
  });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (process.env.NODE_ENV === "development") await setupVite(app, server); else serveStatic(app);
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  server.listen(port, () => console.log(`Server running on http://localhost:${port}/`));
}
startServer().catch(console.error);
