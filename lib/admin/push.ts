import "server-only";

import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:Nailtekandspa52018@yahoo.com";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

function configureWebPush() {
  const config = getVapidConfig();
  if (!config) return null;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return config;
}

export function isPushConfigured() {
  return Boolean(getVapidConfig());
}

export async function savePushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePushSubscription(endpoint: string, userId?: string) {
  const supabase = createAdminClient();
  let query = supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (userId) {
    query = query.eq("user_id", userId);
  }
  const { error } = await query;
  if (error) {
    throw new Error(error.message);
  }
}

async function listSubscriptions(): Promise<StoredSubscription[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    console.error("Failed to load push subscriptions", error);
    return [];
  }

  return (data ?? []) as StoredSubscription[];
}

async function sendToSubscription(
  subscription: StoredSubscription,
  payload: PushPayload
) {
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload)
  );
}

/** Fan out a notification to every subscribed admin device. */
export async function notifyAllAdmins(payload: PushPayload) {
  if (!configureWebPush()) {
    console.warn("Web push skipped — VAPID keys are not configured.");
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await listSubscriptions();
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const supabase = createAdminClient();

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendToSubscription(subscription, payload);
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null;

        // Gone / expired subscription — drop it.
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        } else {
          console.error("Push send failed", subscription.endpoint, error);
        }
      }
    })
  );

  return { sent, failed };
}

export async function notifyNewBooking(input: {
  customerName: string;
  startsAt: Date;
  appointmentId: string;
  source?: string;
}) {
  const when = input.startsAt.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const date = input.startsAt
    .toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

  const sourceLabel =
    input.source === "walk_in"
      ? "Walk-in"
      : input.source === "phone"
        ? "Phone"
        : "Online";

  return notifyAllAdmins({
    title: "New booking",
    body: `${input.customerName} · ${when} (${sourceLabel})`,
    url: `/admin?date=${date}&highlight=${input.appointmentId}`,
  });
}

export async function notifyUpcomingAppointment(input: {
  customerName: string;
  startsAt: Date;
  appointmentId: string;
  technicianName?: string | null;
}) {
  const time = input.startsAt.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  });

  const date = input.startsAt
    .toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

  const tech = input.technicianName ? ` with ${input.technicianName}` : "";

  return notifyAllAdmins({
    title: "Starting in 5 minutes",
    body: `${input.customerName}${tech} at ${time}`,
    url: `/admin?date=${date}&highlight=${input.appointmentId}`,
  });
}
