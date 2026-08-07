/* Nail Tek Admin — service worker for iOS / Android web push */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function pathFromNavigate(navigate) {
  if (!navigate || typeof navigate !== "string") return "/admin";
  try {
    const parsed = new URL(navigate, self.location.origin);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/admin";
  } catch {
    return navigate.startsWith("/") ? navigate : "/admin";
  }
}

function parsePushPayload(event) {
  const defaults = {
    title: "Nail Tek & Spa",
    body: "You have a new update.",
    url: "/admin",
    tag: "nail-tek-admin",
    silent: false,
  };

  if (!event.data) return defaults;

  try {
    const raw = event.data.json();

    // Declarative Web Push (iOS 18.4+) — nested notification dictionary.
    if (raw && typeof raw === "object" && raw.web_push === 8030 && raw.notification) {
      const n = raw.notification;
      return {
        title: n.title || raw.title || defaults.title,
        body: n.body || raw.body || defaults.body,
        url: pathFromNavigate(n.navigate || raw.url),
        tag: n.tag || raw.tag || defaults.tag,
        silent: n.silent === true,
        notificationOptions: n,
      };
    }

    return {
      title: raw.title || defaults.title,
      body: raw.body || defaults.body,
      url: raw.url || defaults.url,
      tag: raw.tag || defaults.tag,
      silent: raw.silent === true,
    };
  } catch {
    try {
      const text = event.data.text();
      if (text) return { ...defaults, body: text };
    } catch {
      /* keep defaults */
    }
    return defaults;
  }
}

async function notifyOpenClientsToPlaySound() {
  const clientsList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clientsList) {
    client.postMessage({ type: "PLAY_BOOKING_ALERT" });
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);

  // Declarative Web Push may attach a proposed notification the OS will show.
  // Only skip showNotification when that fallback is present — otherwise iOS
  // treats the push as silent and can revoke the subscription after a few misses.
  const hasProposed =
    event.notification != null || event.proposedNotification != null;

  event.waitUntil(
    (async () => {
      if (!hasProposed) {
        await self.registration.showNotification(payload.title, {
          body: payload.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: payload.tag,
          renotify: true,
          silent: false,
          data: { url: payload.url || "/admin" },
        });
      }

      try {
        await notifyOpenClientsToPlaySound();
      } catch {
        /* Sound is best-effort; never let it block / fail the push event. */
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    event.notification.data?.url ||
    pathFromNavigate(event.notification.navigate) ||
    "/admin";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
