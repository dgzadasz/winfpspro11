import { describe, expect, it } from "vitest";
import { isPackKey } from "./packs";

describe("pack keys", () => {
  it("only allows registered digital packs", () => {
    expect(isPackKey("sensiNormal")).toBe(true);
    expect(isPackKey("sensiPremium")).toBe(true);
    expect(isPackKey("daily")).toBe(false);
    expect(isPackKey("../../private-packs")).toBe(false);
  });
});
