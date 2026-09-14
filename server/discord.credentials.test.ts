import { describe, expect, it } from "vitest";

describe("Discord integration credentials", () => {
  it("reaches the configured purchase-log webhook", async () => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    expect(webhookUrl).toMatch(/^https:\/\/discord\.com\/api\/webhooks\//);

    const response = await fetch(webhookUrl!, { method: "GET" });
    expect(response.ok).toBe(true);
    const webhook = await response.json() as { channel_id?: string; guild_id?: string };
    expect(webhook.channel_id).toBe(process.env.DISCORD_LOG_CHANNEL_ID);
    expect(webhook.guild_id).toBe(process.env.DISCORD_GUILD_ID);
  }, 15_000);
});
