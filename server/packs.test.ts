import { describe, expect, it } from "vitest";
import { PACK_FILES, isPackKey } from "./packs";

describe("sensitivity packs", () => {
  it("exposes only the three published one-time packs", () => {
    expect(Object.keys(PACK_FILES)).toEqual(["sensiNormal", "sensiPremium", "sensiEmulator"]);
    expect(PACK_FILES.sensiNormal).toBe("sensi-normal.zip");
    expect(PACK_FILES.sensiPremium).toBe("sensi-premium.zip");
    expect(PACK_FILES.sensiEmulator).toBe("sensi-emulator.zip");
  });

  it("rejects arbitrary download paths", () => {
    expect(isPackKey("sensiPremium")).toBe(true);
    expect(isPackKey("../../.env")).toBe(false);
    expect(isPackKey("apk")).toBe(false);
  });
});
