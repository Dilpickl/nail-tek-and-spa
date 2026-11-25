/**
 * Removes all booking-related data (appointments, clients, transactions).
 * Keeps technicians, services, schedules, retail products, and time-off intact.
 *
 * Usage (from repo root, with .env.local present):
 *   npm run clear:bookings -- --yes
 *
 * Without --yes it only shows which database it would wipe and the row counts.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function deleteAll(table) {
  const { error } = await supabase.from(table).delete().gte("created_at", "1970-01-01");
  if (error) {
    const { error: err2 } = await supabase
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (err2) throw new Error(`Failed deleting ${table}: ${err2.message}`);
  }
}

async function clearBookingData() {
  console.log("Clearing booking data…");
  // completed_transactions references appointments (ON DELETE RESTRICT)
  await deleteAll("transaction_line_items");
  await deleteAll("completed_transactions");
  await deleteAll("appointment_reminder_sends");
  await deleteAll("appointment_services");
  await deleteAll("appointments");
  await deleteAll("clients");
  console.log("Cleared.");
}

async function summarize() {
  const tables = [
    "appointments",
    "appointment_services",
    "clients",
    "completed_transactions",
    "transaction_line_items",
    "appointment_reminder_sends",
  ];
  const counts = {};
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    counts[table] = count ?? 0;
  }
  console.log("\nRows:", counts);
}

async function main() {
  console.log(`Database: ${url}`);
  if (!process.argv.includes("--yes")) {
    await summarize();
    console.log("\nDry run: nothing deleted. Deleting cannot be undone. To delete these rows run:");
    console.log("  npm run clear:bookings -- --yes");
    return;
  }
  await clearBookingData();
  await summarize();
  console.log("\nDone. Booking data has been removed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
