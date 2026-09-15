import crypto from "node:crypto";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerDiscordInteractionRoute } from "./discord";
import { approveOrder, cancelOrderByAdmin } from "./orders";
vi.mock("./orders", () => ({ approveOrder: vi.fn(), cancelOrderByAdmin: vi.fn() }));
const keys = crypto.generateKeyPairSync("ed25519");
let server: ReturnType<ReturnType<typeof express>["listen"]>;
let origin: string;
const realFetch = globalThis.fetch;
beforeEach(async () => {
  vi.stubEnv("DISCORD_PUBLIC_KEY", keys.publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("hex"));
  vi.stubEnv("DISCORD_ADMIN_ID", "admin"); vi.stubEnv("DISCORD_LOG_CHANNEL_ID", "channel");
  const app = express(); registerDiscordInteractionRoute(app); app.use(express.json());
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.on("listening", resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(async () => { await new Promise<void>(resolve => server.close(() => resolve())); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetAllMocks(); });
function request(body: unknown, tamper = false) {
  const raw = JSON.stringify(body); const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.sign(null, Buffer.from(timestamp + raw), keys.privateKey).toString("hex");
  return realFetch(`${origin}/api/discord/interactions`, { method: "POST", headers: { "Content-Type": "application/json", "X-Signature-Ed25519": signature, "X-Signature-Timestamp": timestamp }, body: tamper ? raw + " " : raw });
}
const button = { type: 3, application_id: "app", token: "token", member: { user: { id: "admin" } }, channel_id: "channel", data: { custom_id: "sk_approve:ORDER" } };
describe("Discord HTTP interactions", () => {
  it("validates the portal PING", async () => { const r = await request({ type: 1 }); expect(r.status).toBe(200); expect(await r.json()).toEqual({ type: 1 }); });
  it("rejects a modified signed body", async () => { expect((await request({ type: 1 }, true)).status).toBe(401); });
  it("rejects a missing or different application key", async () => { vi.stubEnv("DISCORD_PUBLIC_KEY", ""); expect((await request({ type: 1 })).status).toBe(401); });
  it("does not change orders for another user", async () => { const r = await request({ ...button, member: { user: { id: "other" } } }); expect((await r.json()).data.flags).toBe(64); expect(approveOrder).not.toHaveBeenCalled(); });
  it("allows a member with the confirmation role", async () => { vi.mocked(approveOrder).mockResolvedValue({ orderId: "ORDER", discordName: "Client" } as any); const r = await request({ ...button, member: { user: { id: "moderator" }, roles: ["1496963722210705551"] } }); expect(await r.json()).toEqual({ type: 6 }); await vi.waitFor(() => expect(approveOrder).toHaveBeenCalledWith("ORDER", "moderator")); });
  it("acknowledges while the database is still waiting, then updates the message", async () => {
    let finish!: (value: any) => void;
    vi.mocked(approveOrder).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const r = await request(button); expect(await r.json()).toEqual({ type: 6 }); expect(fetch).not.toHaveBeenCalled();
    finish({ orderId: "ORDER", discordName: "Client" });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/messages/@original"), expect.objectContaining({ method: "PATCH" })));
  });
  it("cancels through the same deferred flow", async () => { vi.mocked(cancelOrderByAdmin).mockResolvedValue({ success: true, orderId: "ORDER", adminId: "admin" }); const r = await request({ ...button, data: { custom_id: "sk_cancel:ORDER" } }); expect(await r.json()).toEqual({ type: 6 }); await vi.waitFor(() => expect(fetch).toHaveBeenCalled()); expect(cancelOrderByAdmin).toHaveBeenCalledWith("ORDER", "admin"); });
  it("reports database failure privately", async () => { vi.mocked(approveOrder).mockRejectedValue(new Error("offline")); expect(await (await request(button)).json()).toEqual({ type: 6 }); await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "POST", body: expect.stringContaining('"flags":64') }))); });
});
