/** Home Assistant rejects WebSocket requests with plain objects, not necessarily Error. */
export function backendErrorMessage(error: unknown, fallback: string): string {
  const value = (error && typeof error === "object" ? error : { message: error }) as { code?: unknown; message?: unknown; details?: { usages?: Array<Record<string, unknown>> } };
  const supplied = typeof value.message === "string" ? value.message.trim() : "";
  const opaque = !supplied || /^(unknown error|unknown_error|unknown)$/i.test(supplied);
  const code = typeof value.code === "string" ? value.code.trim() : "";
  const message = opaque ? `${fallback}${code ? ` (${code})` : ""}` : supplied;
  const usages = Array.isArray(value.details?.usages) ? value.details!.usages!.map((usage) => [usage.profile_key ?? usage.source, usage.entity_id, usage.weekday, usage.start].filter(Boolean).join(" · ")) : [];
  return [message, ...usages].join("\n");
}
