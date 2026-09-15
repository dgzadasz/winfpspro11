import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./discord", () => ({ getDiscordUser: vi.fn() }));
import { getDb } from "./db";
import { getDiscordUser } from "./discord";
import { registerSupportRoutes, validateTicket } from "./support";

describe("support authorization", () => {
  const handlers = new Map<string, any>();
  const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() });
  beforeEach(() => {
    vi.resetAllMocks();
    registerSupportRoutes({ get: (path: string, handler: any) => handlers.set(`GET ${path}`, handler), post: (path: string, handler: any) => handlers.set(`POST ${path}`, handler) } as any);
  });
  it.each(["GET /api/support", "POST /api/support", "POST /api/support/:id/reply"])("requires a session for %s", async route => {
    const res = response(); await handlers.get(route)({}, res);
    expect(res.status).toHaveBeenCalledWith(401); expect(getDb).not.toHaveBeenCalled();
  });
  it("denies customer access to admin replies", async () => {
    vi.mocked(getDiscordUser).mockReturnValue({ id: "customer" } as any);
    const res = response(); await handlers.get("POST /api/support/:id/reply")({}, res);
    expect(res.status).toHaveBeenCalledWith(403); expect(getDb).not.toHaveBeenCalled();
  });
  it("rejects oversized input before database access", async () => {
    vi.mocked(getDiscordUser).mockReturnValue({ id: "customer" } as any);
    const res = response(); await handlers.get("POST /api/support")({ body: { subject: "Ajuda pack", message: "a".repeat(3001) } }, res);
    expect(res.status).toHaveBeenCalledWith(400); expect(getDb).not.toHaveBeenCalled();
  });
  it("does not save tickets against someone else's order", async () => {
    vi.mocked(getDiscordUser).mockReturnValue({ id: "customer" } as any);
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    vi.mocked(getDb).mockResolvedValue({ transaction: (fn: any) => fn({ execute }) } as any);
    const res = response(); await handlers.get("POST /api/support")({ body: { subject: "Ajuda pack", message: "Preciso de ajuda", orderId: "foreign" } }, res);
    expect(res.status).toHaveBeenCalledWith(403); expect(execute).toHaveBeenCalledTimes(2);
  });
  it("limits open tickets before inserting", async () => {
    vi.mocked(getDiscordUser).mockReturnValue({ id: "customer" } as any);
    const execute = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{}, {}, {}] });
    vi.mocked(getDb).mockResolvedValue({ transaction: (fn: any) => fn({ execute }) } as any);
    const res = response(); await handlers.get("POST /api/support")({ body: { subject: "Ajuda pack", message: "Preciso de ajuda" } }, res);
    expect(res.status).toHaveBeenCalledWith(429); expect(execute).toHaveBeenCalledTimes(2);
  });
  it("normalizes user content", () => expect(validateTicket({ subject: " Ajuda pack ", message: " Preciso de ajuda " })).toEqual({ subject: "Ajuda pack", message: "Preciso de ajuda", orderId: "" }));
});
