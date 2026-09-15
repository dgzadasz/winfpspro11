import { describe, expect, it } from "vitest";
import { CATALOG, getProduct } from "../shared/catalog";

describe("product catalog", () => {
  it("keeps unique slugs and checkout-ready prices", () => {
    expect(new Set(CATALOG.map(product => product.slug)).size).toBe(CATALOG.length);
    expect(CATALOG.every(product => product.priceCents > 0 && product.included.length > 0)).toBe(true);
  });
  it("resolves a product by slug", () => {
    expect(getProduct("sensi-premium")?.category).toBe("ai");
  });
  it("does not publish paid sensitivity values or tutorials in the client catalog", () => {
    for (const product of CATALOG) {
      expect(product).not.toHaveProperty("deviceProfiles");
      expect(product).not.toHaveProperty("sensitivity");
      expect(product).not.toHaveProperty("tutorial");
    }
  });
});
