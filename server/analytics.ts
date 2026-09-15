import type { Express } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "./db";

const EVENTS = new Set(["page_view", "product_view", "add_to_cart", "checkout_started", "payment_created", "payment_confirmed", "purchase_completed", "tutorial_opened", "ai_used"]);
const buckets = new Map<string, { count: number; resetAt: number }>();
export function registerAnalyticsRoutes(app: Express) {
  app.post("/api/analytics", async (req, res) => {
    const key = req.ip || "unknown"; const now = Date.now(); const bucket = buckets.get(key); const current = bucket && bucket.resetAt > now ? bucket : { count: 0, resetAt: now + 60_000 }; if (current.count >= 60) return res.status(429).json({ error: "analytics_rate_limited" }); current.count += 1; buckets.set(key, current);
    const event = typeof req.body?.event === "string" ? req.body.event.trim() : "";
    if (!EVENTS.has(event)) return res.status(400).json({ error: "invalid_event" });
    const product = typeof req.body?.product === "string" ? req.body.product.slice(0, 120) : null;
    try {
      const db = await getDb();
      if (db) await db.execute(sql`INSERT INTO analytics_events (event, product) VALUES (${event}, ${product})`);
      return res.status(204).end();
    } catch (error) { console.warn("[Analytics] event not recorded", error); return res.status(204).end(); }
  });
}
