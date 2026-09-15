import { describe, expect, it } from "vitest";
import { selectOwnedPack } from "./pack-access";

describe("license access contract", () => {
  it("does not treat revoked status as active", () => {
    expect(selectOwnedPack([{ id: "x", discordId: "u", plan: "sensiPremium", status: "REVOKED" }], "u", "sensiPremium", "x")).toBeUndefined();
  });
});
