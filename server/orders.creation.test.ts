import { afterEach, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { createOrder } from "./orders";
vi.mock("./db", () => ({ getDb: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());
it("does not persist an order when the Pix key is missing", async () => {
  vi.stubEnv("PIX_KEY", "");
  const insert = vi.fn();
  vi.mocked(getDb).mockResolvedValue({ insert } as any);
  await expect(createOrder({ id: "buyer", displayName: "Buyer" } as any, "sensiNormal"))
    .rejects.toThrow("PIX_KEY is not configured");
  expect(insert).not.toHaveBeenCalled();
});
