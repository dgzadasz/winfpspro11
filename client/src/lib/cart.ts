export const CART_KEY = "sk-store-cart";

export type CartItem = { plan: string; quantity: number };
const validPlans = new Set(["daily", "weekly", "monthly", "lifetime", "sensiNormal", "sensiPremium", "sensiEmulator"]);

export function readCart(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter(item => item && validPlans.has(item.plan) && Number.isInteger(item.quantity) && item.quantity > 0).map(item => item.plan as string))).map(plan => ({ plan, quantity: 1 }));
  } catch { return []; }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items.filter(item => item.quantity > 0)));
  window.dispatchEvent(new Event("sk-cart-updated"));
}

export function addToCart(plan: string) {
  if (!validPlans.has(plan)) return;
  const items = readCart();
  const current = items.find(item => item.plan === plan);
  if (!current) items.push({ plan, quantity: 1 });
  writeCart(items);
}

export function removeFromCart(plan: string) { writeCart(readCart().filter(item => item.plan !== plan)); }
export function cartCount() { return readCart().reduce((sum, item) => sum + item.quantity, 0); }
