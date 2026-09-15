import { beforeEach, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { hasApprovedPack } from "./packs";

vi.mock("./db", () => ({ getDb: vi.fn() }));
const execute = vi.fn();
beforeEach(() => {
  execute.mockReset();
  vi.mocked(getDb).mockResolvedValue({
    select: () => ({ from: () => ({ where: async () => [{ id: "purchase-a", plan: "sensiPremium", status: "approved" }] }) }),
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
it("does not use another approved order to authorize a requested purchase", async () => {
  execute.mockResolvedValue({ rows: [{ status: "ACTIVE", expiresAt: null }] });
  expect(await hasApprovedPack("buyer", "sensiPremium", "purchase-b")).toBe(false);
  expect(execute).not.toHaveBeenCalled();
});
it("denies a revoked license for the selected approved purchase", async () => {
  execute.mockResolvedValue({ rows: [{ status: "REVOKED", expiresAt: null }] });
  expect(await hasApprovedPack("buyer", "sensiPremium", "purchase-a")).toBe(false);
});
