/** Home Assistant rejects WebSocket requests with plain objects, not necessarily Error. */
export function backendErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return typeof error === "string" ? error : fallback;
  const value = error as { message?: unknown; details?: { usages?: Array<Record<string, unknown>> } };
  const message = typeof value.message === "string" ? value.message : fallback;
  const usages = Array.isArray(value.details?.usages) ? value.details!.usages!.map((usage) => [usage.profile_key ?? usage.source, usage.entity_id, usage.weekday, usage.start].filter(Boolean).join(" · ")) : [];
  return [message, ...usages].join("\n");
}
