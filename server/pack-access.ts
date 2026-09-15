type OwnedOrder = { id: string; discordId: string; plan: string; status: string };

// A selected order must never fall back to a different purchase or device.
export function selectOwnedPack<T extends OwnedOrder>(orders: T[], userId: string, pack: string, requested?: unknown): T | undefined {
  if (requested !== undefined && (typeof requested !== "string" || !requested)) return undefined;
  return orders.find(order => order.discordId === userId && order.plan === pack && order.status === "approved" && (requested === undefined || order.id === requested));
}
