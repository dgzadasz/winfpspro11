import { beforeEach, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { approveOrder, cancelOrder, cancelOrderByAdmin } from "./orders";
vi.mock("./db", () => ({ getDb: vi.fn() }));
const limit = vi.fn();
beforeEach(() => {
  limit.mockReset();
  vi.mocked(getDb).mockResolvedValue({
    select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
    update: () => ({ set: () => ({ where: async () => [] }) }),
  } as any);
});
it("does not claim approval if cancellation won the race", async () => {
  limit.mockResolvedValueOnce([{ status: "pending" }]).mockResolvedValueOnce([{ status: "cancelled" }]);
  await expect(approveOrder("order", "admin")).rejects.toThrow("cancelled concurrently");
});
it("does not claim customer cancellation if approval won the race", async () => {
  limit.mockResolvedValueOnce([{ status: "pending" }]).mockResolvedValueOnce([{ status: "approved" }]);
  await expect(cancelOrder("order", "customer")).rejects.toThrow("already approved");
});
it("does not claim admin cancellation if approval won the race", async () => {
  limit.mockResolvedValueOnce([{ status: "pending" }]).mockResolvedValueOnce([{ status: "approved" }]);
  await expect(cancelOrderByAdmin("order", "admin")).rejects.toThrow("already approved");
});
