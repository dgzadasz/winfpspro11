import { sql } from 'drizzle-orm';
import { getDb } from './db';
import { getOrderForUser } from './orders';
import type { Express } from 'express';
import { getDiscordUser } from './discord';

export function validateReview(body: any) {
  const rating = body?.rating;
  const comment = typeof body?.comment === 'string' ? body.comment.trim() : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 3 || comment.length > 1000) throw new Error('Escolha de 1 a 5 estrelas e escreva entre 3 e 1000 caracteres.');
  return { rating, comment };
}

export function registerReviewRoutes(app: Express) {
  app.post('/api/store/orders/:id/review', async (req, res) => {
    const user = getDiscordUser(req);
    if (!user) return res.status(401).json({ error: 'Entre com Discord para avaliar.' });
    let review;
    try { review = validateReview(req.body); } catch (e) { return res.status(400).json({ error: (e as Error).message }); }
    try {
      const order = await getOrderForUser(req.params.id, user.id);
      if (!order || order.status !== 'approved') return res.status(403).json({ error: 'Somente compras aprovadas podem ser avaliadas.' });
      const db = await getDb();
      if (!db) throw new Error('database_unavailable');
      await db.execute(sql`CREATE TABLE IF NOT EXISTS store_reviews (order_id varchar(32) PRIMARY KEY REFERENCES discord_orders(id), rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5), comment text NOT NULL, sent boolean NOT NULL DEFAULT false, created_at timestamp NOT NULL DEFAULT now())`);
      const inserted = await db.execute(sql`INSERT INTO store_reviews (order_id, rating, comment) VALUES (${order.id}, ${review.rating}, ${review.comment}) ON CONFLICT DO NOTHING RETURNING order_id`);
      if (!inserted.rows.length) return res.status(409).json({ error: 'Este pedido já foi avaliado. Obrigado!' });
      const token = process.env.DISCORD_BOT_TOKEN;
      const channel = process.env.DISCORD_SALES_CHANNEL_ID;
      let sent = false;
      if (token && channel) {
        try {
          const response = await fetch(`https://discord.com/api/v10/channels/${channel}/messages`, {
            method: 'POST', signal: AbortSignal.timeout(10000),
            headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ allowed_mentions: { parse: [] }, embeds: [{ title: 'Compra verificada · ' + order.planName, color: 0xa45df0, description: review.comment, fields: [{ name: 'Avaliação', value: '★'.repeat(review.rating) + '☆'.repeat(5-review.rating) }, { name: 'Cliente', value: user.displayName.slice(0, 200) }], footer: { text: `Pedido ${order.id}` } }] })
          });
          sent = response.ok;
          if (sent) await db.execute(sql`UPDATE store_reviews SET sent = true WHERE order_id = ${order.id}`);
        } catch { console.warn('[Reviews] Discord delivery pending'); }
      }
      return res.json({ message: sent ? 'Avaliação publicada no Discord. Obrigado!' : 'Avaliação salva. O envio ao Discord está pendente.' });
    } catch { return res.status(503).json({ error: 'Não foi possível salvar a avaliação. Tente novamente.' }); }
  });
}
