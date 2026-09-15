import { beforeEach, describe, expect, it, vi } from "vitest";
beforeEach(() => vi.stubEnv("PIX_KEY", "test-pix-key"));
import { pixPayload, pixQrDataUrl, PLANS } from "./orders";

describe("store orders", () => {
  it("builds a Pix payload with the selected amount and order reference", () => {
    const payload = pixPayload({ id: "TESTORDER01", plan: "weekly" });
    expect(payload).toContain("5405");
    expect(payload).toContain("40.00");
    expect(payload).toContain("TESTORDER01");
    expect(payload).not.toContain("Discord");
    expect(payload).not.toContain("Cliente");
    expect(payload).toMatch(/[0-9A-F]{4}$/);
  });

  it("keeps the four published plans and prices stable", () => {
    expect(Object.keys(PLANS)).toEqual(["daily", "weekly", "monthly", "lifetime", "sensiNormal", "sensiPremium", "sensiEmulator"]);
    expect(PLANS.daily.amountCents).toBe(1000);
    expect(PLANS.weekly.amountCents).toBe(4000);
    expect(PLANS.monthly.amountCents).toBe(12000);
    expect(PLANS.lifetime.days).toBe(0);
    expect(PLANS.sensiNormal.amountCents).toBe(1990);
    expect(PLANS.sensiPremium.amountCents).toBe(3990);
    expect(PLANS.sensiEmulator.amountCents).toBe(2990);
  });

  it("generates a QR image without embedding customer identity", async () => {
    const qr = await pixQrDataUrl({ id: "TESTORDER01", plan: "weekly" });
    expect(qr).toMatch(/^data:image\/png;base64,/);
    expect(qr).not.toContain("Discord");
  });
});
