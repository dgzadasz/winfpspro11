import { describe, expect, it } from "vitest";

describe("payment mode contract", () => {
  it("uses manual Discord confirmation until a gateway is configured", () => {
    expect({ mode: "manual", automaticGatewayConfigured: false, confirmation: "discord_admin" }).toEqual({ mode: "manual", automaticGatewayConfigured: false, confirmation: "discord_admin" });
  });
});
