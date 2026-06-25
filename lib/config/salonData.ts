/**
 * ============================================================================
 *  SALON DATA — SINGLE SOURCE OF TRUTH
 * ============================================================================
 *  This file holds ALL business-facing copy and data: hours, contact info,
 *  services, prices, durations, technicians, careers, and social links.
 *
 *  The owner can edit THIS FILE ONLY to update the website — no need to touch
 *  component code. Everything on the frontend maps over the values below.
 *
 *  NOTE: All values are structural placeholders. Replace the text/numbers with
 *  the real salon details. Keep the SHAPE (the keys) the same so the site keeps
 *  rendering correctly.
 * ============================================================================
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BusinessHours {
  /** Day label shown to customers, e.g. "Monday" */
  day: string;
  /** Human-readable hours, e.g. "9:00 AM – 7:00 PM" or "Closed" */
  hours: string;
  /** Used by the booking engine. null = closed that day. */
  open: string | null; // "09:00" (24h)
  close: string | null; // "19:00" (24h)
}

export interface Service {
  /** Stable unique id — used by the booking engine + database. Do not reuse. */
  id: string;
  name: string;
  description: string;
  /** Price in whole US dollars. */
  price: number;
  /** Duration in minutes. Used to compute booking time blocks. */
  durationMinutes: number;
  /** Optional flag to surface a service in the home "gallery" highlight. */
  featured?: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  /** Short tagline shown under the category heading. */
  blurb: string;
  services: Service[];
}

export interface Technician {
  id: string;
  name: string;
  /** e.g. "Master Nail Technician", "Senior Esthetician" */
  role: string;
  bio: string;
  /** Service category ids this tech is best known for. */
  specialties: string[];
  /** Years of experience — supports the "established" story. */
  yearsExperience: number;
  /** Optional headshot path/URL. */
  avatarUrl?: string;
}

export interface JobPosting {
  id: string;
  title: string;
  type: "Full-Time" | "Part-Time" | "Contract";
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Business identity                                                  */
/* ------------------------------------------------------------------ */

export const business = {
  name: "Nail Tek & Spa",
  tagline: "Artistry, Sanitation & Serenity — Since 1994",
  /** Headline number used throughout for the trust story. */
  yearsOfExperience: 30,
  establishedYear: 1994,
  shortDescription:
    "A premier nail salon and spa where decades of mastery meet meticulous sanitation and a calm, welcoming atmosphere.",
  phone: "(555) 123-4567",
  /** Digits only — used for tel: links. */
  phoneRaw: "+15551234567",
  email: "hello@nailtekandspa.com",
  address: {
    line1: "123 Maple Avenue",
    line2: "Suite 4",
    city: "Springfield",
    state: "CA",
    zip: "90001",
  },
  /** Paste your Google Maps embed URL (Share > Embed a map > copy src). */
  googleMapsEmbedUrl:
    "https://www.google.com/maps?q=123+Maple+Avenue+Springfield+CA&output=embed",
  /** Google "Write a review" / profile link for the review widget + CTA. */
  googleReviewUrl: "https://g.page/r/your-google-place-id/review",
} as const;

/* ------------------------------------------------------------------ */
/*  Hours of operation                                                 */
/* ------------------------------------------------------------------ */

export const hours: BusinessHours[] = [
  { day: "Monday", hours: "9:00 AM – 7:00 PM", open: "09:00", close: "19:00" },
  { day: "Tuesday", hours: "9:00 AM – 7:00 PM", open: "09:00", close: "19:00" },
  { day: "Wednesday", hours: "9:00 AM – 7:00 PM", open: "09:00", close: "19:00" },
  { day: "Thursday", hours: "9:00 AM – 8:00 PM", open: "09:00", close: "20:00" },
  { day: "Friday", hours: "9:00 AM – 8:00 PM", open: "09:00", close: "20:00" },
  { day: "Saturday", hours: "8:30 AM – 6:00 PM", open: "08:30", close: "18:00" },
  { day: "Sunday", hours: "Closed", open: null, close: null },
];

/* ------------------------------------------------------------------ */
/*  Social links                                                       */
/* ------------------------------------------------------------------ */

export const socials = {
  facebook: "https://facebook.com/your-salon",
  instagram: "https://instagram.com/your-salon",
} as const;

/* ------------------------------------------------------------------ */
/*  Services (grouped by category)                                     */
/* ------------------------------------------------------------------ */

export const serviceCategories: ServiceCategory[] = [
  {
    id: "manicures",
    name: "Manicures",
    blurb: "Clean, polished, and precise — hands that make an impression.",
    services: [
      {
        id: "mani-classic",
        name: "Classic Manicure",
        description:
          "Nail shaping, cuticle care, a relaxing hand massage, and your choice of polish.",
        price: 28,
        durationMinutes: 30,
        featured: true,
      },
      {
        id: "mani-gel",
        name: "Gel Manicure",
        description:
          "Long-lasting, chip-resistant gel color cured to a flawless, glossy finish.",
        price: 42,
        durationMinutes: 45,
        featured: true,
      },
      {
        id: "mani-spa",
        name: "Signature Spa Manicure",
        description:
          "Our classic manicure elevated with an exfoliating scrub, warm mask, and extended massage.",
        price: 55,
        durationMinutes: 60,
      },
    ],
  },
  {
    id: "pedicures",
    name: "Pedicures",
    blurb: "Restorative foot care in our deep-cushioned spa chairs.",
    services: [
      {
        id: "pedi-classic",
        name: "Classic Pedicure",
        description:
          "Soak, nail and cuticle care, callus smoothing, massage, and polish.",
        price: 40,
        durationMinutes: 45,
        featured: true,
      },
      {
        id: "pedi-deluxe",
        name: "Deluxe Spa Pedicure",
        description:
          "A luxurious soak with sea salt scrub, hydrating mask, hot towels, and an extended leg massage.",
        price: 65,
        durationMinutes: 60,
        featured: true,
      },
      {
        id: "pedi-gel",
        name: "Gel Pedicure",
        description:
          "All the care of our classic pedicure finished with durable, high-shine gel color.",
        price: 55,
        durationMinutes: 60,
      },
    ],
  },
  {
    id: "enhancements",
    name: "Nail Enhancements",
    blurb: "Strength and length, sculpted with decades of technique.",
    services: [
      {
        id: "enh-acrylic-full",
        name: "Acrylic Full Set",
        description:
          "Custom-sculpted acrylic extensions shaped to your preferred length and style.",
        price: 60,
        durationMinutes: 75,
      },
      {
        id: "enh-acrylic-fill",
        name: "Acrylic Fill",
        description: "Maintenance fill to refresh your existing acrylic set.",
        price: 45,
        durationMinutes: 60,
      },
      {
        id: "enh-dip",
        name: "Dip Powder Set",
        description:
          "Lightweight, durable color with a strengthening dip system — no UV lamp required.",
        price: 50,
        durationMinutes: 60,
        featured: true,
      },
    ],
  },
  {
    id: "art-addons",
    name: "Nail Art & Add-Ons",
    blurb: "The finishing touches that make your set one of a kind.",
    services: [
      {
        id: "addon-art-simple",
        name: "Nail Art (per nail)",
        description: "Hand-painted designs, accents, and embellishments.",
        price: 5,
        durationMinutes: 15,
      },
      {
        id: "addon-french",
        name: "French Tip",
        description: "Timeless French finish added to any service.",
        price: 10,
        durationMinutes: 15,
      },
      {
        id: "addon-removal",
        name: "Soak-Off Removal",
        description: "Gentle, safe removal of gel, acrylic, or dip.",
        price: 15,
        durationMinutes: 15,
      },
    ],
  },
];

/** Flat list of every service — convenient for the booking engine + lookups. */
export const allServices: Service[] = serviceCategories.flatMap(
  (c) => c.services
);

/** Quick lookup of a service by id. */
export function getServiceById(id: string): Service | undefined {
  return allServices.find((s) => s.id === id);
}

/* ------------------------------------------------------------------ */
/*  Technicians                                                        */
/* ------------------------------------------------------------------ */

export const technicians: Technician[] = [
  {
    id: "tech-linh",
    name: "Linh Tran",
    role: "Founder & Master Nail Technician",
    bio: "Linh opened the salon in 1994 and remains its heart — renowned for flawless gel work and a calming chair-side presence.",
    specialties: ["manicures", "enhancements", "art-addons"],
    yearsExperience: 30,
  },
  {
    id: "tech-maria",
    name: "Maria Santos",
    role: "Senior Pedicure Specialist",
    bio: "Maria's spa pedicures are legendary. She blends therapeutic massage with meticulous foot care.",
    specialties: ["pedicures", "manicures"],
    yearsExperience: 18,
  },
  {
    id: "tech-james",
    name: "James Cole",
    role: "Nail Artist",
    bio: "James specializes in custom nail art and sculpted enhancements, turning every set into wearable art.",
    specialties: ["enhancements", "art-addons"],
    yearsExperience: 9,
  },
  {
    id: "tech-amy",
    name: "Amy Nguyen",
    role: "Nail Technician",
    bio: "Amy is a versatile all-rounder with a precise, gentle touch and a warm, welcoming manner.",
    specialties: ["manicures", "pedicures", "enhancements"],
    yearsExperience: 6,
  },
];

/** Quick lookup of a technician by id. */
export function getTechnicianById(id: string): Technician | undefined {
  return technicians.find((t) => t.id === id);
}

/* ------------------------------------------------------------------ */
/*  Careers                                                            */
/* ------------------------------------------------------------------ */

export const careers: JobPosting[] = [
  {
    id: "job-nail-tech",
    title: "Licensed Nail Technician",
    type: "Full-Time",
    description:
      "Join a 30-year institution. We're seeking a licensed technician skilled in gel, acrylic, and dip who shares our commitment to sanitation and client care.",
  },
  {
    id: "job-front-desk",
    title: "Front Desk Coordinator",
    type: "Part-Time",
    description:
      "Be the welcoming first impression of our salon. Manage bookings, greet guests, and keep the front of house running smoothly.",
  },
];

/* ------------------------------------------------------------------ */
/*  Why choose us (trust pillars)                                      */
/* ------------------------------------------------------------------ */

export const trustPillars = [
  {
    title: "30+ Years of Mastery",
    description:
      "Decades perfecting our craft — technique you can see and feel in every visit.",
  },
  {
    title: "Hospital-Grade Sanitation",
    description:
      "Sterilized tools, single-use files, and rigorous protocols. Your safety is never an afterthought.",
  },
  {
    title: "A Calm, Relaxing Escape",
    description:
      "An unhurried, serene atmosphere designed to make every appointment feel like a retreat.",
  },
] as const;

/** Legal page metadata (TOS / Privacy are auto-generated from business info). */
export const legal = {
  businessLegalName: "Nail Tek & Spa LLC",
  lastUpdated: "January 1, 2026",
} as const;
