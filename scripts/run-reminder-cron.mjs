#!/usr/bin/env node
/**
 * Optional local/dev helper: poll the reminder endpoint every minute.
 * Production: point an external cron (or Vercel Pro cron) at
 *   GET /api/cron/appointment-reminders
 * with header: Authorization: Bearer $CRON_SECRET
 */
const url = process.env.REMINDER_URL;
const secret = process.env.CRON_SECRET;

if (!url || !secret) {
  console.error("Set REMINDER_URL and CRON_SECRET");
  process.exit(1);
}

async function tick() {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await response.text();
    console.log(new Date().toISOString(), response.status, body);
  } catch (error) {
    console.error(new Date().toISOString(), error);
  }
}

tick();
setInterval(tick, 60_000);
