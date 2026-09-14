import { describe, expect, it } from "vitest";

describe("Discord bot credentials", () => {
  it("authenticates against the Discord bot identity endpoint", async () => {
    const token = process.env.DISCORD_BOT_TOKEN;
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
    });
    expect(response.ok).toBe(true);
    const bot = await response.json() as { bot?: boolean; id?: string };
    expect(bot.bot).toBe(true);
    expect(bot.id).toBe(process.env.DISCORD_CLIENT_ID);
  }, 15_000);
});
