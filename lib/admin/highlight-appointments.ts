const STORAGE_KEY = "admin-new-appointment-ids";

export function queueAppointmentHighlights(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;

  const existing = readQueuedAppointmentHighlights();
  const merged = Array.from(new Set([...existing, ...ids]));
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function readQueuedAppointmentHighlights(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function clearQueuedAppointmentHighlights() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
