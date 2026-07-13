/**
 * Clears all booking-related data and inserts realistic demo appointments
 * so the owner can see how the admin app looks with real-looking traffic.
 *
 * Usage (from repo root, with .env.local present):
 *   node scripts/seed-demo-bookings.mjs
 *
 * Keeps technicians, services, schedules, and retail products intact.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

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

const SALON_TZ = "America/Chicago";

/** Calendar YYYY-MM-DD in America/Chicago for an instant. */
function chicagoDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** YYYY-MM-DD for today ± dayOffset in salon timezone. */
function dayOffset(offsetDays) {
  const { year, month, day } = chicagoDateParts();
  // Noon UTC avoids DST edge cases when shifting calendar days.
  const base = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Wall-clock instant in America/Chicago as an ISO string.
 * Uses the zone's offset for that calendar day (handles CST/CDT).
 */
function at(date, time) {
  const probe = new Date(`${date}T12:00:00Z`);
  const offsetPart = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TZ,
    timeZoneName: "shortOffset",
  })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName")?.value; // e.g. "GMT-5"
  const match = offsetPart?.match(/GMT([+-]\d+)(?::(\d+))?/);
  const hours = match ? Number(match[1]) : -5;
  const mins = match?.[2] ? Number(match[2]) : 0;
  const sign = hours <= 0 ? "-" : "+";
  const absH = String(Math.abs(hours)).padStart(2, "0");
  const absM = String(Math.abs(mins)).padStart(2, "0");
  return `${date}T${time}:00${sign}${absH}:${absM}`;
}

function addMinutes(iso, minutes) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/** Shorthand: salon-local datetime N days from today. */
function onDay(offsetDays, time) {
  return at(dayOffset(offsetDays), time);
}

const TECH = {
  travis: "tech-travis",
  daisy: "tech-daisy",
  adam: "tech-adam",
  vickie: "tech-vickie",
};

const SVC = {
  pediVolcanic: { id: "pedi-volcanic", name: "Volcanic Spa Pedicure", price: 65, mins: 75 },
  pediOrganic: { id: "pedi-organic", name: "Organic Spa Pedicure", price: 55, mins: 70 },
  pediDeluxe: { id: "pedi-deluxe", name: "Deluxe Spa Pedicure", price: 45, mins: 60 },
  pediLuxury: { id: "pedi-luxury", name: "Luxury Spa Pedicure", price: 35, mins: 55 },
  pediClassic: { id: "pedi-classic", name: "Classic Pedicure", price: 25, mins: 45 },
  maniClassic: { id: "mani-classic", name: "Classic Manicure", price: 15, mins: 30 },
  maniNoChip: { id: "mani-no-chip", name: "No-Chip Manicure", price: 35, mins: 45 },
  combo: { id: "combo-mani-pedi", name: "Classic Mani & Pedi Combo", price: 40, mins: 75 },
  acrylicFull: { id: "enh-acrylic-full", name: "Acrylic — Full Set", price: 35, mins: 75 },
  acrylicFill: { id: "enh-acrylic-fill", name: "Acrylic — Fill-In", price: 25, mins: 60 },
  gelFull: { id: "enh-gel-full", name: "Gel — Full Set", price: 45, mins: 75 },
  gelFill: { id: "enh-gel-fill", name: "Gel — Fill-In", price: 35, mins: 60 },
  dipping: { id: "enh-dipping", name: "Dipping Powder", price: 45, mins: 70 },
  french: { id: "addon-french", name: "French Tip Add-On", price: 10, mins: 15 },
  paraffin: { id: "addon-paraffin", name: "Paraffin Treatment", price: 10, mins: 15 },
  waxBrows: { id: "wax-eyebrows", name: "Eyebrows", price: 10, mins: 15 },
  lashExt: { id: "lash-extensions", name: "Eyelash Extensions", price: 40, mins: 60 },
};

const RETAIL = {
  cuticle: { id: "retail-cuticle-oil", name: "Cuticle Oil", price: 12 },
  cream: { id: "retail-hand-cream", name: "Hand Cream", price: 18 },
  polish: { id: "retail-polish", name: "Nail Polish", price: 14 },
  file: { id: "retail-nail-file", name: "Glass Nail File", price: 8 },
};

async function deleteAll(table) {
  const { error } = await supabase.from(table).delete().gte("created_at", "1970-01-01");
  if (error) {
    // Some tables may not have created_at — fall back to id filter
    const { error: err2 } = await supabase
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (err2) throw new Error(`Failed deleting ${table}: ${err2.message}`);
  }
}

async function clearBookingData() {
  console.log("Clearing booking data…");
  // transaction_line_items has no created_at in filter-friendly way — delete via parent cascade
  // but completed_transactions is ON DELETE RESTRICT on appointments, so order matters.
  await deleteAll("transaction_line_items");
  await deleteAll("completed_transactions");
  await deleteAll("appointment_services");
  await deleteAll("appointments");
  await deleteAll("clients");
  console.log("Cleared.");
}

function servicesTotal(services) {
  return services.reduce((sum, s) => sum + s.price, 0);
}

function servicesDuration(services) {
  return services.reduce((sum, s) => sum + s.mins, 0);
}

/**
 * @typedef {object} DemoAppt
 * @property {string} id
 * @property {string|null} technicianId
 * @property {boolean} [anyTechnician]
 * @property {string} name
 * @property {string} phone
 * @property {string|null} [email]
 * @property {string} startsAt
 * @property {string} status
 * @property {string} source
 * @property {boolean} [smsConsent]
 * @property {string|null} [notes]
 * @property {string|null} [partyGroupId]
 * @property {boolean} [isGuest]
 * @property {string|null} [clientId]
 * @property {ReturnType<typeof Object.values>[number][]} services
 * @property {object|null} [transaction]
 */

function buildDemo() {
  const clients = [
    { id: randomUUID(), name: "Sarah Mitchell", phone: "8475550101", email: "sarah.mitchell@example.com", firstVisit: onDay(-62, "15:00") },
    { id: randomUUID(), name: "Emily Chen", phone: "8475550102", email: "emily.chen@example.com", firstVisit: onDay(-101, "11:30") },
    { id: randomUUID(), name: "Jessica Rivera", phone: "8475550103", email: "jessica.rivera@example.com", firstVisit: onDay(-42, "10:00") },
    { id: randomUUID(), name: "Amanda Brooks", phone: "8475550104", email: "amanda.brooks@example.com", firstVisit: onDay(-117, "14:00") },
    { id: randomUUID(), name: "Nicole Patel", phone: "8475550105", email: "nicole.patel@example.com", firstVisit: onDay(-46, "16:00") },
    { id: randomUUID(), name: "Lauren Kim", phone: "8475550106", email: "lauren.kim@example.com", firstVisit: onDay(-23, "12:00") },
    { id: randomUUID(), name: "Megan Torres", phone: "8475550107", email: null, firstVisit: onDay(-11, "09:30") },
    { id: randomUUID(), name: "Rachel Nguyen", phone: "8475550108", email: "rachel.nguyen@example.com", firstVisit: onDay(-149, "13:00") },
    { id: randomUUID(), name: "Olivia Hart", phone: "8475550109", email: "olivia.hart@example.com", firstVisit: onDay(-33, "15:30") },
    { id: randomUUID(), name: "Hannah Price", phone: "8475550110", email: null, firstVisit: onDay(-5, "11:00") },
    { id: randomUUID(), name: "Brittany Walsh", phone: "8475550111", email: "brittany.walsh@example.com", firstVisit: onDay(-69, "10:00") },
    { id: randomUUID(), name: "Stephanie Diaz", phone: "8475550112", email: "stephanie.diaz@example.com", firstVisit: onDay(-82, "17:00") },
  ];

  const byPhone = Object.fromEntries(clients.map((c) => [c.phone, c]));
  const partyId = randomUUID();

  /** @type {DemoAppt[]} */
  const appointments = [];

  function addAppt(opts) {
    const services = opts.services;
    const duration = servicesDuration(services);
    const startsAt = opts.startsAt;
    appointments.push({
      id: randomUUID(),
      technicianId: opts.technicianId ?? null,
      anyTechnician: opts.anyTechnician ?? false,
      name: opts.name,
      phone: opts.phone,
      email: opts.email ?? byPhone[opts.phone]?.email ?? null,
      startsAt,
      endsAt: addMinutes(startsAt, duration),
      status: opts.status,
      source: opts.source ?? "online",
      smsConsent: opts.smsConsent ?? true,
      notes: opts.notes ?? null,
      partyGroupId: opts.partyGroupId ?? null,
      isGuest: opts.isGuest ?? false,
      clientId: opts.clientId ?? (opts.status === "completed" ? byPhone[opts.phone]?.id ?? null : null),
      estimatedTotal: servicesTotal(services),
      services,
      transaction: opts.transaction ?? null,
    });
  }

  // ——— Past completed (last ~2 weeks) for analytics ———
  addAppt({
    name: "Sarah Mitchell",
    phone: "8475550101",
    technicianId: TECH.travis,
    startsAt: onDay(-12, "10:00"),
    status: "completed",
    source: "online",
    services: [SVC.pediVolcanic, SVC.maniNoChip],
    transaction: {
      payment: "card",
      tip: 18,
      retail: [RETAIL.cuticle],
      completedAt: onDay(-12, "12:05"),
    },
  });

  addAppt({
    name: "Emily Chen",
    phone: "8475550102",
    technicianId: TECH.daisy,
    startsAt: onDay(-12, "14:00"),
    status: "completed",
    source: "phone",
    services: [SVC.gelFill],
    transaction: {
      payment: "cash",
      tip: 8,
      retail: [],
      completedAt: onDay(-12, "15:10"),
    },
  });

  addAppt({
    name: "Jessica Rivera",
    phone: "8475550103",
    technicianId: TECH.vickie,
    startsAt: onDay(-11, "11:00"),
    status: "completed",
    source: "walk_in",
    services: [SVC.pediDeluxe, SVC.waxBrows],
    notes: "Preferred soft pink polish",
    transaction: {
      payment: "card",
      tip: 12,
      retail: [RETAIL.polish],
      completedAt: onDay(-11, "12:20"),
    },
  });

  addAppt({
    name: "Amanda Brooks",
    phone: "8475550104",
    technicianId: TECH.adam,
    startsAt: onDay(-10, "09:30"),
    status: "completed",
    source: "online",
    services: [SVC.acrylicFull, SVC.french],
    transaction: {
      payment: "apple_pay",
      tip: 10,
      retail: [RETAIL.file],
      completedAt: onDay(-10, "11:05"),
    },
  });

  addAppt({
    name: "Nicole Patel",
    phone: "8475550105",
    technicianId: TECH.travis,
    startsAt: onDay(-10, "15:00"),
    status: "completed",
    source: "online",
    services: [SVC.combo],
    transaction: {
      payment: "card",
      tip: 10,
      retail: [],
      completedAt: onDay(-10, "16:20"),
    },
  });

  addAppt({
    name: "Lauren Kim",
    phone: "8475550106",
    technicianId: TECH.daisy,
    startsAt: onDay(-8, "10:00"),
    status: "completed",
    source: "online",
    services: [SVC.pediOrganic, SVC.maniClassic],
    transaction: {
      payment: "card",
      tip: 15,
      discount: 5,
      retail: [RETAIL.cream],
      completedAt: onDay(-8, "11:40"),
    },
  });

  addAppt({
    name: "Megan Torres",
    phone: "8475550107",
    technicianId: TECH.vickie,
    startsAt: onDay(-6, "13:00"),
    status: "completed",
    source: "walk_in",
    services: [SVC.pediClassic, SVC.paraffin],
    transaction: {
      payment: "cash",
      tip: 5,
      retail: [],
      completedAt: onDay(-6, "14:05"),
    },
  });

  addAppt({
    name: "Rachel Nguyen",
    phone: "8475550108",
    technicianId: TECH.adam,
    startsAt: onDay(-5, "11:00"),
    status: "completed",
    source: "online",
    services: [SVC.dipping, SVC.waxBrows],
    transaction: {
      payment: "card",
      tip: 12,
      retail: [RETAIL.cuticle, RETAIL.polish],
      completedAt: onDay(-5, "12:30"),
    },
  });

  addAppt({
    name: "Olivia Hart",
    phone: "8475550109",
    technicianId: TECH.travis,
    startsAt: onDay(-4, "16:00"),
    status: "completed",
    source: "phone",
    services: [SVC.lashExt],
    transaction: {
      payment: "card",
      tip: 10,
      retail: [],
      completedAt: onDay(-4, "17:05"),
    },
  });

  addAppt({
    name: "Hannah Price",
    phone: "8475550110",
    technicianId: TECH.daisy,
    startsAt: onDay(-3, "10:30"),
    status: "completed",
    source: "online",
    services: [SVC.gelFull],
    transaction: {
      payment: "apple_pay",
      tip: 9,
      retail: [],
      completedAt: onDay(-3, "11:50"),
    },
  });

  addAppt({
    name: "Brittany Walsh",
    phone: "8475550111",
    technicianId: TECH.vickie,
    startsAt: onDay(-2, "14:00"),
    status: "completed",
    source: "online",
    services: [SVC.pediLuxury, SVC.maniNoChip],
    transaction: {
      payment: "card",
      tip: 14,
      retail: [RETAIL.cream],
      completedAt: onDay(-2, "15:30"),
    },
  });

  addAppt({
    name: "Stephanie Diaz",
    phone: "8475550112",
    technicianId: TECH.adam,
    startsAt: onDay(-1, "09:00"),
    status: "completed",
    source: "walk_in",
    services: [SVC.acrylicFill],
    transaction: {
      payment: "cash",
      tip: 6,
      retail: [],
      completedAt: onDay(-1, "10:05"),
    },
  });

  // Repeat visit for Sarah (shows returning client)
  addAppt({
    name: "Sarah Mitchell",
    phone: "8475550101",
    technicianId: TECH.travis,
    startsAt: onDay(-2, "10:00"),
    status: "completed",
    source: "online",
    services: [SVC.pediDeluxe],
    notes: "Regular — every other week",
    transaction: {
      payment: "card",
      tip: 10,
      retail: [],
      completedAt: onDay(-2, "11:05"),
    },
  });

  // ——— Cancelled / no-show ———
  addAppt({
    name: "Kelly Morgan",
    phone: "8475550201",
    email: "kelly.morgan@example.com",
    technicianId: TECH.daisy,
    startsAt: onDay(-7, "15:00"),
    status: "cancelled",
    source: "online",
    services: [SVC.maniNoChip],
    notes: "Customer cancelled — schedule conflict",
  });

  addAppt({
    name: "Tina Alvarez",
    phone: "8475550202",
    email: null,
    technicianId: TECH.adam,
    startsAt: onDay(-4, "12:00"),
    status: "cancelled",
    source: "phone",
    services: [SVC.pediClassic],
  });

  addAppt({
    name: "Chris Jordan",
    phone: "8475550203",
    email: "chris.jordan@example.com",
    technicianId: TECH.vickie,
    startsAt: onDay(-5, "16:00"),
    status: "no_show",
    source: "online",
    services: [SVC.gelFill],
    notes: "No-show — left voicemail",
  });

  addAppt({
    name: "Pat Reese",
    phone: "8475550204",
    email: null,
    technicianId: TECH.travis,
    startsAt: onDay(-9, "11:00"),
    status: "no_show",
    source: "walk_in",
    services: [SVC.maniClassic, SVC.waxBrows],
  });

  // ——— Today — mix of completed earlier + still booked ———
  addAppt({
    name: "Emily Chen",
    phone: "8475550102",
    technicianId: TECH.daisy,
    startsAt: onDay(0, "09:00"),
    status: "completed",
    source: "online",
    services: [SVC.pediVolcanic],
    transaction: {
      payment: "card",
      tip: 12,
      retail: [RETAIL.cuticle],
      completedAt: onDay(0, "10:20"),
    },
  });

  addAppt({
    name: "Walk-In Guest",
    phone: "8475550301",
    email: null,
    technicianId: TECH.adam,
    startsAt: onDay(0, "10:00"),
    status: "completed",
    source: "walk_in",
    smsConsent: false,
    services: [SVC.maniClassic],
    clientId: null, // will create a client on seed for completed
    transaction: {
      payment: "cash",
      tip: 3,
      retail: [],
      completedAt: onDay(0, "10:35"),
    },
  });

  addAppt({
    name: "Jessica Rivera",
    phone: "8475550103",
    technicianId: TECH.vickie,
    startsAt: onDay(0, "13:00"),
    status: "booked",
    source: "phone",
    services: [SVC.acrylicFill, SVC.french],
    notes: "Fill + French tips",
  });

  addAppt({
    name: "Amanda Brooks",
    phone: "8475550104",
    technicianId: TECH.travis,
    startsAt: onDay(0, "14:30"),
    status: "booked",
    source: "online",
    services: [SVC.combo],
  });

  addAppt({
    name: "Any Tech Booking",
    phone: "8475550302",
    email: "any.tech@example.com",
    technicianId: null,
    anyTechnician: true,
    startsAt: onDay(0, "16:00"),
    status: "booked",
    source: "online",
    services: [SVC.pediLuxury],
    notes: "First available technician",
  });

  // ——— Upcoming this week / next ———
  addAppt({
    name: "Nicole Patel",
    phone: "8475550105",
    technicianId: TECH.daisy,
    startsAt: onDay(1, "10:00"),
    status: "booked",
    source: "online",
    services: [SVC.gelFill],
  });

  addAppt({
    name: "Lauren Kim",
    phone: "8475550106",
    technicianId: TECH.adam,
    startsAt: onDay(1, "11:30"),
    status: "booked",
    source: "online",
    services: [SVC.pediDeluxe, SVC.maniNoChip],
  });

  addAppt({
    name: "Rachel Nguyen",
    phone: "8475550108",
    technicianId: TECH.travis,
    startsAt: onDay(1, "15:00"),
    status: "booked",
    source: "phone",
    services: [SVC.pediOrganic],
  });

  // Party booking (primary + guest)
  addAppt({
    name: "Olivia Hart",
    phone: "8475550109",
    technicianId: TECH.vickie,
    startsAt: onDay(2, "11:00"),
    status: "booked",
    source: "online",
    partyGroupId: partyId,
    isGuest: false,
    services: [SVC.pediVolcanic, SVC.maniNoChip],
    notes: "Birthday party — with friend",
  });
  addAppt({
    name: "Maya Hart",
    phone: "8475550109",
    email: null,
    technicianId: TECH.daisy,
    startsAt: onDay(2, "11:00"),
    status: "booked",
    source: "online",
    partyGroupId: partyId,
    isGuest: true,
    services: [SVC.pediDeluxe, SVC.maniClassic],
  });

  addAppt({
    name: "Hannah Price",
    phone: "8475550110",
    technicianId: TECH.adam,
    startsAt: onDay(2, "14:00"),
    status: "booked",
    source: "online",
    services: [SVC.dipping],
  });

  addAppt({
    name: "Brittany Walsh",
    phone: "8475550111",
    technicianId: TECH.travis,
    startsAt: onDay(3, "09:30"),
    status: "booked",
    source: "online",
    services: [SVC.acrylicFull],
  });

  addAppt({
    name: "Stephanie Diaz",
    phone: "8475550112",
    technicianId: TECH.vickie,
    startsAt: onDay(3, "13:00"),
    status: "booked",
    source: "walk_in",
    services: [SVC.pediClassic, SVC.waxBrows],
  });

  addAppt({
    name: "Megan Torres",
    phone: "8475550107",
    technicianId: null,
    anyTechnician: true,
    startsAt: onDay(4, "10:00"),
    status: "booked",
    source: "online",
    services: [SVC.maniNoChip, SVC.paraffin],
  });

  addAppt({
    name: "Sarah Mitchell",
    phone: "8475550101",
    technicianId: TECH.travis,
    startsAt: onDay(5, "11:00"),
    status: "booked",
    source: "online",
    services: [SVC.pediVolcanic],
    notes: "Next regular visit",
  });

  addAppt({
    name: "Emily Chen",
    phone: "8475550102",
    technicianId: TECH.daisy,
    startsAt: onDay(5, "14:00"),
    status: "booked",
    source: "online",
    services: [SVC.gelFull, SVC.french],
  });

  addAppt({
    name: "New Client Demo",
    phone: "8475550401",
    email: "new.client@example.com",
    technicianId: TECH.adam,
    startsAt: onDay(7, "10:00"),
    status: "booked",
    source: "online",
    services: [SVC.combo, SVC.waxBrows],
    notes: "First visit — referred by Google",
  });

  addAppt({
    name: "Weekend Pedi",
    phone: "8475550402",
    email: null,
    technicianId: TECH.vickie,
    startsAt: onDay(8, "12:00"),
    status: "booked",
    source: "phone",
    services: [SVC.pediLuxury],
  });

  addAppt({
    name: "Jessica Rivera",
    phone: "8475550103",
    technicianId: TECH.travis,
    startsAt: onDay(9, "15:30"),
    status: "booked",
    source: "online",
    services: [SVC.lashExt],
  });

  // Ensure walk-in completed today has a client row
  const walkInClient = {
    id: randomUUID(),
    name: "Walk-In Guest",
    phone: "8475550301",
    email: null,
    firstVisit: onDay(0, "10:00"),
  };
  clients.push(walkInClient);
  const walkInAppt = appointments.find((a) => a.phone === "8475550301" && a.status === "completed");
  if (walkInAppt) walkInAppt.clientId = walkInClient.id;

  return { clients, appointments };
}

async function insertDemo({ clients, appointments }) {
  console.log(`Inserting ${clients.length} clients…`);
  const { error: clientErr } = await supabase.from("clients").insert(
    clients.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      first_visit_at: c.firstVisit,
    }))
  );
  if (clientErr) throw new Error(`clients: ${clientErr.message}`);

  console.log(`Inserting ${appointments.length} appointments…`);
  const apptRows = appointments.map((a) => ({
    id: a.id,
    technician_id: a.technicianId,
    any_technician: a.anyTechnician,
    customer_name: a.name,
    customer_phone: a.phone,
    customer_email: a.email,
    starts_at: a.startsAt,
    ends_at: a.endsAt,
    status: a.status,
    source: a.source,
    sms_consent: a.smsConsent,
    notes: a.notes,
    party_group_id: a.partyGroupId,
    is_guest: a.isGuest,
    client_id: a.clientId,
    estimated_total: a.estimatedTotal,
  }));

  const { error: apptErr } = await supabase.from("appointments").insert(apptRows);
  if (apptErr) throw new Error(`appointments: ${apptErr.message}`);

  const serviceRows = appointments.flatMap((a) =>
    a.services.map((s) => ({
      appointment_id: a.id,
      service_id: s.id,
      price_at_booking: s.price,
      duration_at_booking: s.mins,
    }))
  );
  const { error: svcErr } = await supabase.from("appointment_services").insert(serviceRows);
  if (svcErr) throw new Error(`appointment_services: ${svcErr.message}`);

  const completed = appointments.filter((a) => a.status === "completed" && a.transaction);
  console.log(`Inserting ${completed.length} completed transactions…`);

  const txRows = [];
  const lineRows = [];

  for (const a of completed) {
    const txId = randomUUID();
    const tx = a.transaction;
    const retail = tx.retail ?? [];
    const discount = tx.discount ?? 0;
    const subtotalServices = a.estimatedTotal;
    const subtotalRetail = retail.reduce((sum, r) => sum + r.price, 0);
    const tip = tx.tip ?? 0;
    const finalTotal = subtotalServices + subtotalRetail - discount + tip;

    txRows.push({
      id: txId,
      appointment_id: a.id,
      completed_at: tx.completedAt,
      payment_method: tx.payment,
      subtotal_services: subtotalServices,
      subtotal_retail: subtotalRetail,
      discount_amount: discount,
      tax_amount: 0,
      tip_amount: tip,
      refund_amount: 0,
      final_total: finalTotal,
      notes: null,
    });

    for (const s of a.services) {
      lineRows.push({
        transaction_id: txId,
        line_type: "service",
        service_id: s.id,
        product_id: null,
        name: s.name,
        quantity: 1,
        unit_price: s.price,
        line_total: s.price,
      });
    }
    for (const r of retail) {
      lineRows.push({
        transaction_id: txId,
        line_type: "retail",
        service_id: null,
        product_id: r.id,
        name: r.name,
        quantity: 1,
        unit_price: r.price,
        line_total: r.price,
      });
    }
  }

  const { error: txErr } = await supabase.from("completed_transactions").insert(txRows);
  if (txErr) throw new Error(`completed_transactions: ${txErr.message}`);

  const { error: lineErr } = await supabase.from("transaction_line_items").insert(lineRows);
  if (lineErr) throw new Error(`transaction_line_items: ${lineErr.message}`);
}

async function summarize() {
  const statuses = ["booked", "completed", "cancelled", "no_show"];
  const counts = {};
  for (const status of statuses) {
    const { count, error } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    if (error) throw error;
    counts[status] = count ?? 0;
  }
  const { count: clients } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });
  const { count: txs } = await supabase
    .from("completed_transactions")
    .select("*", { count: "exact", head: true });

  console.log("\nDemo data loaded:");
  console.log(counts);
  console.log(`clients: ${clients}, transactions: ${txs}`);
}

async function main() {
  await clearBookingData();
  const demo = buildDemo();
  await insertDemo(demo);
  await summarize();
  console.log("\nDone. Open the admin dashboard to review the demo bookings.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
