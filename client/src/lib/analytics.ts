export function track(event: string, product?: string) {
  void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, product }) }).catch(() => undefined);
}
