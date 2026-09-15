import { beforeEach, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { hasApprovedPack } from "./packs";

vi.mock("./db", () => ({ getDb: vi.fn() }));
const execute = vi.fn();
beforeEach(() => {
  execute.mockReset();
  vi.mocked(getDb).mockResolvedValue({
    select: () => ({ from: () => ({ where: async () => [{ plan: "sensiPremium", status: "approved" }] }) }),
    execute,
  } as any);
});
it("denies access when license lookup fails despite an approved order", async () => {
  execute.mockRejectedValue(new Error("database unavailable"));
  expect(await hasApprovedPack("buyer", "sensiPremium")).toBe(false);
});
it.each(["REVOKED", "SUSPENDED", "EXPIRED"])("denies a %s license", async status => {
  execute.mockResolvedValue({ rows: [{ status, expiresAt: null }] });
  expect(await hasApprovedPack("buyer", "sensiPremium")).toBe(false);
});
it("denies an active license whose expiry has passed", async () => {
  execute.mockResolvedValue({ rows: [{ status: "ACTIVE", expiresAt: "2000-01-01" }] });
  expect(await hasApprovedPack("buyer", "sensiPremium")).toBe(false);
});
it("accepts an active perpetual license", async () => {
  execute.mockResolvedValue({ rows: [{ status: "ACTIVE", expiresAt: null }] });
  expect(await hasApprovedPack("buyer", "sensiPremium")).toBe(true);
});
