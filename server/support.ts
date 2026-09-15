import type { Express } from "express";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { getDiscordUser } from "./discord";

export function validateTicket(body: unknown) {
  const data = body as Record<string, unknown> | null;
  const subject = typeof data?.subject === "string" ? data.subject.trim() : "";
  const message = typeof data?.message === "string" ? data.message.trim() : "";
  const orderId = typeof data?.orderId === "string" ? data.orderId.trim() : "";
  if (subject.length < 5 || subject.length > 120 || message.length < 10 || message.length > 3000 || orderId.length > 32) throw new Error("Informe assunto de 5 a 120 caracteres e mensagem de 10 a 3000 caracteres.");
  return { subject, message, orderId };
}

export function registerSupportRoutes(app: Express) {
  app.get("/api/support", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: "Entre com Discord para consultar seus chamados." });
    try {
      const db = await getDb(); if (!db) throw new Error("database_unavailable");
      const isAdmin = Boolean(process.env.DISCORD_ADMIN_ID && user.id === process.env.DISCORD_ADMIN_ID);
      const result = isAdmin
        ? await db.execute(sql`SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 100`)
        : await db.execute(sql`SELECT * FROM support_tickets WHERE discord_id = ${user.id} ORDER BY created_at DESC LIMIT 50`);
      res.setHeader("Cache-Control", "private, no-store");
      return res.json({ tickets: result.rows, isAdmin });
    } catch { return res.status(503).json({ error: "Não foi possível carregar os chamados. Tente novamente." }); }
  });
  app.post("/api/support", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: "Entre com Discord para abrir um chamado." });
    let input;
    try { input = validateTicket(req.body); } catch (error) { return res.status(400).json({ error: (error as Error).message }); }
    try {
      const db = await getDb(); if (!db) throw new Error("database_unavailable");
      const result = await db.transaction(async tx => {
        // Serialize creation per account so simultaneous requests cannot bypass the limit.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`);
        if (input.orderId) {
          const owned = await tx.execute(sql`SELECT id FROM discord_orders WHERE id = ${input.orderId} AND "discordId" = ${user.id}`);
          if (!owned.rows.length) return { status: 403, body: { error: "Este pedido não pertence à sua conta." } };
        }
        const existing = await tx.execute(sql`SELECT id FROM support_tickets WHERE discord_id = ${user.id} AND status = 'open' LIMIT 3`);
        if (existing.rows.length >= 3) return { status: 429, body: { error: "Você já tem três chamados abertos. Aguarde uma resposta." } };
        const id = randomUUID();
        await tx.execute(sql`INSERT INTO support_tickets (id, discord_id, order_id, subject, message) VALUES (${id}, ${user.id}, ${input.orderId || null}, ${input.subject}, ${input.message})`);
        return { status: 201, body: { id } };
      });
      return res.status(result.status).json(result.body);
    } catch { return res.status(503).json({ error: "Não foi possível salvar o chamado. Tente novamente." }); }
  });
  app.post("/api/support/:id/reply", async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: "Entre com Discord." });
    if (!process.env.DISCORD_ADMIN_ID || user.id !== process.env.DISCORD_ADMIN_ID) return res.status(403).json({ error: "Acesso restrito ao administrador." });
    const reply = typeof req.body?.reply === "string" ? req.body.reply.trim() : "";
    if (reply.length < 3 || reply.length > 3000) return res.status(400).json({ error: "Escreva uma resposta de 3 a 3000 caracteres." });
    try {
      const db = await getDb(); if (!db) throw new Error("database_unavailable");
      const result = await db.execute(sql`UPDATE support_tickets SET reply = ${reply}, replied_by = ${user.id}, status = 'answered', updated_at = now() WHERE id = ${req.params.id} AND status = 'open' RETURNING id`);
      if (!result.rows.length) return res.status(409).json({ error: "Chamado inexistente ou já respondido. Atualize a página." });
      return res.json({ success: true });
    } catch { return res.status(503).json({ error: "Não foi possível salvar a resposta." }); }
  });
}
