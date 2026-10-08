export const MAX_REALTIME_USER_LABEL_CHARS = 120;

export function normalizeRealtimeUserLabel(value?: string) {
  const normalized = value?.trim() || "Usuario";
  return normalized.length > MAX_REALTIME_USER_LABEL_CHARS
    ? normalized.slice(0, MAX_REALTIME_USER_LABEL_CHARS)
    : normalized;
}
