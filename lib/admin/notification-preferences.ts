const STORAGE_KEY = "admin-notification-alerts-enabled";

export function areNotificationAlertsEnabled(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function setNotificationAlertsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(enabled));
}
