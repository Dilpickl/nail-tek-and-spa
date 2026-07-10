/**
 * ============================================================================
 *  SALON DATA — SINGLE SOURCE OF TRUTH
 * ============================================================================
 *  This file holds ALL business-facing copy and data: hours, contact info,
 *  services, prices, durations, technicians, careers, and social links.
 *
 *  The owner can edit THIS FILE ONLY to update the website — no need to touch
 *  component code. Everything on the frontend maps over the values below.
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

export interface ServiceVariant {
  /** Stable unique id — stored on appointment_services. Do not reuse. */
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  /** When true, display as "From $X" (exact price confirmed at visit). */
  priceFrom?: boolean;
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
  /** When true, price is finalized at checkout — not included in online booking totals. */
  pricingTbd?: boolean;
  /** When true, display as "From $X" (starting price; may run higher). */
  priceFrom?: boolean;
  /** Optional note shown under the price (e.g. Pink Fill $40). */
  priceNote?: string;
  /** Bookable sub-options shown as checkboxes when this service is selected. */
  variants?: ServiceVariant[];
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
  yearsExperience?: number;
  /** Optional headshot path/URL. */
  avatarUrl?: string;
}

export interface JobPosting {
  id: string;
  title: string;
  type: "Full-Time" | "Part-Time" | "Contract";
  description: string;
}

export interface RetailProduct {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  /** Optional source label, e.g. "Google Review" */
  source?: string;
}

/* ------------------------------------------------------------------ */
/*  Business identity                                                  */
/* ------------------------------------------------------------------ */

export const business = {
  name: "Nail Tek & Spa",
  tagline: "Premium nail care at refreshing prices",
  /** Location line used in the header under the salon name. */
  locationLabel: "Algonquin, IL",
  shortDescription:
    "Located in the heart of Algonquin on Randall Road, Nail Tek & Spa offers premium nail services at highly affordable prices. The beautiful, spacious interior creates a relaxing atmosphere, fully staffed by a team of kind and welcoming nail technicians. Specializing in amazing custom nail art designs, the salon provides high-quality, professional care and luxurious results without the luxury price tag. Walk-ins are always welcome.",
  phone: "(847) 458-4560",
  /** Digits only — used for tel: links. */
  phoneRaw: "+18474584560",
  /** Public contact email. */
  email: "Nailtekandspa52018@yahoo.com",
  address: {
    line1: "2403 W Algonquin Road",
    line2: "",
    city: "Algonquin",
    state: "IL",
    zip: "60102",
  },
  googleMapsEmbedUrl:
    "https://www.google.com/maps?q=2403+W+Algonquin+Road,+Algonquin,+IL+60102&output=embed",
  /** Google "Write a review" link (Place ID from Maps). */
  googleReviewUrl:
    "https://search.google.com/local/writereview?placeid=ChIJIT2ayIYTD4gRih5T16UhBpA",
  /** Public Google Maps profile / reviews listing. */
  googleMapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Nail+Tek+%26+Spa+2403+W+Algonquin+Road+Algonquin+IL&query_place_id=ChIJIT2ayIYTD4gRih5T16UhBpA",
  googleRating: 4.3,
  googleReviewCount: 177,
  walkInsWelcome: true,
  giftCardsAvailable: true,
} as const;

/* ------------------------------------------------------------------ */
/*  Hours of operation                                                 */
/* ------------------------------------------------------------------ */

export const hours: BusinessHours[] = [
  { day: "Monday", hours: "9:00 AM – 8:00 PM", open: "09:00", close: "20:00" },
  { day: "Tuesday", hours: "9:00 AM – 8:00 PM", open: "09:00", close: "20:00" },
  { day: "Wednesday", hours: "9:00 AM – 8:00 PM", open: "09:00", close: "20:00" },
  { day: "Thursday", hours: "9:00 AM – 8:00 PM", open: "09:00", close: "20:00" },
  { day: "Friday", hours: "9:00 AM – 8:00 PM", open: "09:00", close: "20:00" },
  { day: "Saturday", hours: "9:00 AM – 6:00 PM", open: "09:00", close: "18:00" },
  { day: "Sunday", hours: "11:00 AM – 5:00 PM", open: "11:00", close: "17:00" },
];

/* ------------------------------------------------------------------ */
/*  Social links                                                       */
/* ------------------------------------------------------------------ */

export const socials = {
  facebook: "https://www.facebook.com/nailtekandspa2019/",
  instagram:
    "https://www.instagram.com/explore/locations/1659690550793757/nail-tek-and-spa/",
} as const;

/* ------------------------------------------------------------------ */
/*  Services (grouped by category)                                     */
/* ------------------------------------------------------------------ */

export const serviceCategories: ServiceCategory[] = [
  {
    id: "pedicures",
    name: "Premium Pedicure Experiences",
    blurb:
      "Treat your feet to the ultimate relaxation. From quick refreshers to luxurious spa escapes, we have the perfect pedicure for you.",
    services: [
      {
        id: "pedi-volcanic",
        name: "Volcanic Spa Pedicure",
        description:
          "Feel the eruption of total relaxation! This delightfully fun treatment features a bubbling volcanic explosion that relaxes your senses. It includes an exfoliating sugar scrub, a rejuvenating collagen cream mask, and a creamy collagen massage lotion. Finished with a soothing hot stone massage and a warm paraffin treatment to leave your skin silky smooth.",
        price: 65,
        durationMinutes: 75,
        featured: true,
      },
      {
        id: "pedi-organic",
        name: "Organic Spa Pedicure",
        description:
          "Treat your feet to our signature spa pedicure, expertly designed to repair dry, tired skin. This revitalizing treatment features an organic lavender scrub exfoliation and a rehydrating green tea mask. Accompanied by a rich cream massage, hot stones, and a hydrating paraffin treatment.",
        price: 55,
        durationMinutes: 70,
        featured: true,
      },
      {
        id: "pedi-deluxe",
        name: "Deluxe Spa Pedicure",
        description:
          "The ideal rescue for dry and cracked heels. This deluxe service includes a special sea scrub to gently buff away rough spots, followed by a hydrating massage cream. Complete with a relaxing hot stone massage and a deep-moisturizing paraffin treatment.",
        price: 45,
        durationMinutes: 60,
      },
      {
        id: "pedi-luxury",
        name: "Luxury Spa Pedicure",
        description:
          "A deeply relaxing pedicure that is perfect for tired, sore feet. This service includes your choice of a sugar or sea salt exfoliating scrub, followed by a tension-melting hot stone and leg massage.",
        price: 35,
        durationMinutes: 55,
      },
      {
        id: "pedi-princess",
        name: "Princess Spa Pedicure",
        description:
          "Give your feet the royal treatment! This service upgrades our Classic Pedicure by adding a gentle exfoliation of the legs and feet, followed by a dip into warm, soothing paraffin—perfect for healing dry and cracked skin.",
        price: 35,
        durationMinutes: 55,
      },
      {
        id: "pedi-classic",
        name: "Classic Pedicure",
        description:
          "Our fast, refreshing essential pedicure. Includes comprehensive nail shaping and cuticle care, finished with a moisturizing foot and leg massage and your choice of polish.",
        price: 25,
        durationMinutes: 45,
        featured: true,
      },
    ],
  },
  {
    id: "manicures",
    name: "Manicures & Combos",
    blurb: "Classic care and long-lasting color for beautiful hands.",
    services: [
      {
        id: "mani-classic",
        name: "Classic Manicure",
        description:
          "Essential nail shaping, cuticle care, moisturizing massage, and standard polish.",
        price: 15,
        durationMinutes: 30,
        featured: true,
      },
      {
        id: "mani-no-chip",
        name: "No-Chip Manicure",
        description:
          "Our classic manicure finished with long-lasting, smudge-free gel polish.",
        price: 35,
        durationMinutes: 45,
        featured: true,
      },
      {
        id: "combo-mani-pedi",
        name: "Classic Mani & Pedi Combo",
        description:
          "The perfect pairing of our Classic Manicure and Classic Pedicure.",
        price: 40,
        durationMinutes: 75,
      },
    ],
  },
  {
    id: "enhancements",
    name: "Nail Enhancements",
    blurb: "Durable, flawless, and beautifully crafted artificial nail services.",
    services: [
      {
        id: "enh-acrylic",
        name: "Acrylic",
        description:
          "Custom-sculpted acrylic nails — choose a full set or a fill-in to refresh your existing set.",
        price: 35,
        durationMinutes: 75,
        variants: [
          {
            id: "enh-acrylic-full",
            name: "Full Set",
            price: 35,
            durationMinutes: 75,
          },
          {
            id: "enh-acrylic-fill",
            name: "Fill-In",
            price: 25,
            durationMinutes: 60,
          },
        ],
      },
      {
        id: "enh-gel",
        name: "Gel",
        description:
          "Strong, natural-looking gel enhancements for a polished, lasting finish.",
        price: 45,
        durationMinutes: 75,
        variants: [
          {
            id: "enh-gel-full",
            name: "Full Set",
            price: 45,
            durationMinutes: 75,
          },
          {
            id: "enh-gel-fill",
            name: "Fill-In",
            price: 35,
            durationMinutes: 60,
          },
        ],
      },
      {
        id: "enh-pink-white",
        name: "Pink & White",
        description:
          "Classic pink-and-white acrylic enhancements. Pricing starts at the listed rates and may vary with length and design. Pink Fill also available for $40.",
        price: 45,
        durationMinutes: 80,
        priceFrom: true,
        priceNote: "Pink Fill available for $40",
        variants: [
          {
            id: "enh-pink-white-full",
            name: "Full Set",
            price: 45,
            durationMinutes: 80,
            priceFrom: true,
          },
          {
            id: "enh-pink-white-fill",
            name: "Fill-In",
            price: 35,
            durationMinutes: 65,
            priceFrom: true,
          },
          {
            id: "enh-pink-fill",
            name: "Pink Fill",
            price: 40,
            durationMinutes: 65,
          },
        ],
      },
      {
        id: "enh-gel-powder",
        name: "Gel Powder Color",
        description:
          "Vibrant gel powder color applied for a smooth, lasting finish. Full set only.",
        price: 45,
        durationMinutes: 70,
      },
      {
        id: "enh-dipping",
        name: "Dipping Powder",
        description:
          "Lightweight, durable dipping powder color — no UV lamp required. Full set only.",
        price: 45,
        durationMinutes: 70,
        featured: true,
      },
    ],
  },
  {
    id: "polish-addons",
    name: "Polish Changes, Add-Ons & Maintenance",
    blurb: "The perfect finishing touches to keep your nails looking fresh.",
    services: [
      {
        id: "addon-no-chip-change",
        name: "No-Chip Polish Change",
        description: "Refresh your gel color with a long-lasting no-chip polish change.",
        price: 25,
        durationMinutes: 30,
      },
      {
        id: "addon-finger-polish",
        name: "Fingernail Polish Change",
        description: "A quick color refresh for your fingernails.",
        price: 10,
        durationMinutes: 20,
      },
      {
        id: "addon-toe-polish",
        name: "Toenail Polish Change",
        description: "A quick color refresh for your toenails.",
        price: 15,
        durationMinutes: 25,
      },
      {
        id: "addon-french",
        name: "French Tip Add-On",
        description: "Add a timeless French tip finish to any service.",
        price: 10,
        durationMinutes: 15,
      },
      {
        id: "addon-paraffin",
        name: "Paraffin Treatment",
        description:
          "A warm, hydrating paraffin dip to soften and soothe dry skin on hands or feet.",
        price: 10,
        durationMinutes: 15,
      },
      {
        id: "addon-repair",
        name: "Nail Repair",
        description:
          "Quick repair for a broken or damaged nail. Final price depends on the repair needed.",
        price: 5,
        durationMinutes: 15,
        priceFrom: true,
      },
      {
        id: "addon-removal",
        name: "Nails Removal",
        description:
          "Safe removal of artificial nails or gel polish. Final price depends on the removal needed.",
        price: 5,
        durationMinutes: 20,
        priceFrom: true,
      },
      {
        id: "addon-art",
        name: "Custom Nail Art",
        description:
          "Show us your inspiration — our techs specialize in custom nail art designs. Pricing depends on complexity and is confirmed at your visit.",
        price: 0,
        durationMinutes: 20,
        pricingTbd: true,
      },
    ],
  },
  {
    id: "waxing",
    name: "Waxing Services",
    blurb: "Smooth, precise waxing for face and body — done with care.",
    services: [
      {
        id: "wax-eyebrows",
        name: "Eyebrows",
        description: "Clean, shaped brows with a precise wax.",
        price: 10,
        durationMinutes: 15,
      },
      {
        id: "wax-lips",
        name: "Lips",
        description: "Quick upper-lip wax for a smooth finish.",
        price: 10,
        durationMinutes: 10,
      },
      {
        id: "wax-brows-lips",
        name: "Eyebrows & Lips",
        description: "Brow shaping and lip wax together.",
        price: 15,
        durationMinutes: 20,
      },
      {
        id: "wax-chin",
        name: "Chin",
        description: "Gentle chin waxing for a clean look.",
        price: 5,
        durationMinutes: 10,
      },
      {
        id: "wax-underarms",
        name: "Under Arms",
        description: "Smooth underarm waxing.",
        price: 25,
        durationMinutes: 20,
      },
      {
        id: "wax-half-arms",
        name: "Half Arms",
        description: "Waxing from wrist to elbow.",
        price: 35,
        durationMinutes: 30,
      },
      {
        id: "wax-half-legs",
        name: "Half Legs",
        description: "Waxing from ankle to knee.",
        price: 45,
        durationMinutes: 35,
      },
      {
        id: "wax-back",
        name: "Back",
        description:
          "Full or partial back waxing. Pricing starts at $50 and varies with coverage.",
        price: 50,
        durationMinutes: 40,
        priceFrom: true,
      },
      {
        id: "wax-bikini",
        name: "Bikini Lines",
        description:
          "Bikini-line waxing. Pricing starts at $40 and varies with the style requested.",
        price: 40,
        durationMinutes: 30,
        priceFrom: true,
      },
    ],
  },
  {
    id: "eyelashes",
    name: "Eyelash Services",
    blurb: "Lift and define your look with professional lash care.",
    services: [
      {
        id: "lash-extensions",
        name: "Eyelash Extensions",
        description:
          "Beautiful, natural-looking eyelash extensions applied with care for added length and volume.",
        price: 40,
        durationMinutes: 60,
      },
      {
        id: "lash-tinting",
        name: "Eyelash Tinting",
        description:
          "Tint your natural lashes for a soft, defined look without mascara.",
        price: 30,
        durationMinutes: 30,
      },
    ],
  },
];

function resolveVariantService(parent: Service, variant: ServiceVariant): Service {
  const pricingTbd = Boolean(parent.pricingTbd);
  return {
    id: variant.id,
    name: `${parent.name} — ${variant.name}`,
    description: parent.description,
    price: pricingTbd ? 0 : variant.price,
    durationMinutes: variant.durationMinutes,
    pricingTbd,
    priceFrom: variant.priceFrom ?? parent.priceFrom,
    priceNote: parent.priceNote,
  };
}

const serviceParentByVariantId = new Map<string, Service>();
const serviceById = new Map<string, Service>();

for (const category of serviceCategories) {
  for (const service of category.services) {
    serviceById.set(service.id, service);
    for (const variant of service.variants ?? []) {
      serviceParentByVariantId.set(variant.id, service);
      serviceById.set(variant.id, resolveVariantService(service, variant));
    }
  }
}

/** Flat list of every bookable service — includes variant rows for the booking engine. */
export const allServices: Service[] = Array.from(serviceById.values());

/** Quick lookup of a service by id (parent or variant). */
export function getServiceById(id: string): Service | undefined {
  return serviceById.get(id);
}

export function getServiceParent(serviceId: string): Service | undefined {
  return serviceParentByVariantId.get(serviceId);
}

export function getServiceVariantIds(service: Service): string[] {
  if (service.variants?.length) {
    return service.variants.map((variant) => variant.id);
  }
  return [service.id];
}

export function getSelectedServiceVariantId(
  serviceIds: string[],
  service: Service
): string | undefined {
  return getSelectedServiceVariantIds(serviceIds, service)[0];
}

export function getSelectedServiceVariantIds(
  serviceIds: string[],
  service: Service
): string[] {
  const ids = new Set(getServiceVariantIds(service));
  return serviceIds.filter((id) => ids.has(id));
}

export function getServiceCategoryId(serviceId: string): string | undefined {
  const direct = serviceCategories.find((c) =>
    c.services.some((s) => s.id === serviceId)
  )?.id;
  if (direct) return direct;

  const parent = getServiceParent(serviceId);
  return parent ? getServiceCategoryId(parent.id) : undefined;
}

/** Categories treated as add-ons at completion / analytics. */
const ADDON_CATEGORY_IDS = new Set(["polish-addons"]);

export function isAddonService(serviceId: string): boolean {
  return ADDON_CATEGORY_IDS.has(getServiceCategoryId(serviceId) ?? "");
}

/* ------------------------------------------------------------------ */
/*  Retail products (sold at checkout, not booked online)              */
/* ------------------------------------------------------------------ */

export const retailProducts: RetailProduct[] = [
  { id: "retail-cuticle-oil", name: "Cuticle Oil", price: 12, category: "Care" },
  { id: "retail-hand-cream", name: "Hand Cream", price: 18, category: "Care" },
  { id: "retail-nail-file", name: "Glass Nail File", price: 8, category: "Tools" },
  { id: "retail-polish", name: "Nail Polish", price: 14, category: "Color" },
  { id: "retail-gift-card", name: "Gift Card", price: 50, category: "Gift Cards" },
];

export function getRetailProductById(id: string): RetailProduct | undefined {
  return retailProducts.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/*  Technicians — marketing mirror only; operational data lives in DB  */
/* ------------------------------------------------------------------ */

export const technicians: Technician[] = [
  {
    id: "tech-travis",
    name: "Travis",
    role: "Owner & Nail Technician",
    bio: "Travis owns Nail Tek & Spa and is known for meticulous nail art — bring any inspiration photo and he’ll recreate it beautifully.",
    specialties: ["manicures", "enhancements", "polish-addons", "eyelashes"],
  },
  {
    id: "tech-daisy",
    name: "Daisy",
    role: "Nail Technician",
    bio: "Daisy treats every guest like family, delivering beautiful results with warmth and care.",
    specialties: ["manicures", "pedicures", "enhancements"],
  },
  {
    id: "tech-adam",
    name: "Adam",
    role: "Nail Technician",
    bio: "Adam is a versatile technician with a confident, welcoming presence — from nails to brows.",
    specialties: ["manicures", "pedicures", "waxing", "eyelashes"],
  },
  {
    id: "tech-vickie",
    name: "Vickie",
    role: "Nail Technician",
    bio: "Vickie brings a steady, professional touch and a friendly chair-side manner to every appointment.",
    specialties: ["manicures", "pedicures", "enhancements"],
  },
];

/** Quick lookup of a technician by id. */
export function getTechnicianById(id: string): Technician | undefined {
  return technicians.find((t) => t.id === id);
}

/* ------------------------------------------------------------------ */
/*  Featured Google testimonials (home Reviews section)                */
/* ------------------------------------------------------------------ */

export const testimonials: Testimonial[] = [
  {
    quote:
      "They were kind enough to accommodate me right away! It was actually my first time having a male technician do my eyebrows, which was a fun surprise. I started to explain exactly what I wanted, but he confidently assured me not to worry and promised I’d be happy with the outcome. He absolutely delivered……I couldn’t be more pleased with the results!",
    name: "Google Reviewer",
    source: "Google",
  },
  {
    quote:
      "Travis and Daisy always leave me happy with my nails and always treat me like family! Travis goes above and beyond with his nail designs and we always have a great time at my appointments. You can show Travis any inspiration pictures and he can recreate them perfectly! They are also very efficient with their time and get you done within an hour. This will forever be my nail salon!",
    name: "Samantha F.",
    source: "Google",
  },
  {
    quote:
      "I am always super nervous to try anything but a solid color at new salons. I was looking in the area for well rated nail salons when I came across this one and decided to give it a try. Glad I did. The staff was extremely friendly and respectful. I can’t say enough good things about them. It was all smiles. They did a wonderful job. I live an hour away but would definitely make the trip to return back to this salon. Thank you Travis & Daisy!!!",
    name: "Google Reviewer",
    source: "Google",
  },
  {
    quote:
      "I’ve lived in the Algonquin area for some time and it’s been so hard to find a nail salon I can actually go back to!! I stumbled upon Nail Tek & Spa being that it is super close to my house and YAY amazing work. My shape is beautiful and I actually found a place I’ll be more than happy to go back to. 10/10 recommended (:",
    name: "Google Reviewer",
    source: "Google",
  },
];

/* ------------------------------------------------------------------ */
/*  Careers                                                            */
/* ------------------------------------------------------------------ */

export const careers: JobPosting[] = [
  {
    id: "job-nail-tech",
    title: "Licensed Nail Technician",
    type: "Full-Time",
    description:
      "Join our friendly Algonquin team. We’re looking for a licensed technician skilled in manicures, pedicures, and enhancements who shares our commitment to quality work and kind client care.",
  },
  {
    id: "job-front-desk",
    title: "Front Desk Coordinator",
    type: "Part-Time",
    description:
      "Be the welcoming first impression of our salon. Greet guests, help with walk-ins and bookings, and keep the front of house running smoothly.",
  },
];

/* ------------------------------------------------------------------ */
/*  Why choose us (trust pillars)                                      */
/* ------------------------------------------------------------------ */

export const trustPillars = [
  {
    title: "Custom Nail Art",
    description:
      "Bring any inspiration photo — our techs specialize in recreating intricate designs with precision and creativity.",
  },
  {
    title: "Premium Care, Fair Prices",
    description:
      "Luxurious spa pedicures, lasting color, and professional results — without the luxury price tag.",
  },
  {
    title: "Walk-Ins Always Welcome",
    description:
      "Book online or stop by anytime during salon hours. Gift cards are available for every occasion.",
  },
] as const;

/** Legal page metadata (TOS / Privacy are auto-generated from business info). */
export const legal = {
  businessLegalName: "Nail Tek & Spa INC",
  lastUpdated: "July 9, 2026",
} as const;
