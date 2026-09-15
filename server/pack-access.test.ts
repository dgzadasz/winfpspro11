import { describe, expect, it } from "vitest";
import { selectOwnedPack } from "./pack-access";

const orders = [
  { id: "phone-a", discordId: "owner", plan: "sensiNormal", status: "approved" },
  { id: "phone-b", discordId: "owner", plan: "sensiNormal", status: "approved" },
  { id: "pending", discordId: "owner", plan: "sensiNormal", status: "pending" },
  { id: "other", discordId: "someone-else", plan: "sensiNormal", status: "approved" },
];
describe("pack access", () => {
  it("opens the exact purchased device", () => expect(selectOwnedPack(orders, "owner", "sensiNormal", "phone-b")?.id).toBe("phone-b"));
  it.each(["unknown", "pending", "other", "", ["phone-a"]])("rejects an invalid selected purchase %s", id => expect(selectOwnedPack(orders, "owner", "sensiNormal", id)).toBeUndefined());
  it("rejects a different product", () => expect(selectOwnedPack(orders, "owner", "sensiPremium", "phone-a")).toBeUndefined());
  it("supports existing links without an order", () => expect(selectOwnedPack(orders, "owner", "sensiNormal")?.id).toBe("phone-a"));
});
