import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { addToCart, readCart, removeFromCart, CART_KEY } from "../client/src/lib/cart";
let values: Map<string, string>;
beforeEach(() => { values = new Map(); vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) }); vi.stubGlobal("window", { dispatchEvent: vi.fn() }); });
afterEach(() => vi.unstubAllGlobals());
it("persists selections and avoids duplicate access purchases", () => { addToCart("sensiPremium"); addToCart("sensiPremium"); expect(JSON.parse(values.get(CART_KEY)!)).toEqual([{ plan: "sensiPremium", quantity: 1 }]); expect(readCart()).toEqual([{ plan: "sensiPremium", quantity: 1 }]); });
it("removes only the purchased or removed item", () => { addToCart("daily"); addToCart("sensiNormal"); removeFromCart("daily"); expect(readCart()).toEqual([{ plan: "sensiNormal", quantity: 1 }]); });
it("recovers from invalid saved data and migrates old quantities", () => { values.set(CART_KEY, "broken"); expect(readCart()).toEqual([]); values.set(CART_KEY, JSON.stringify([{ plan: "unknown", quantity: 1 }, { plan: "daily", quantity: 3 }])); expect(readCart()).toEqual([{ plan: "daily", quantity: 1 }]); });
