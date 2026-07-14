import type { MetadataRoute } from "next";

import { business } from "@/lib/config/salonData";

/** PWA manifest — install to iOS home screen for admin push notifications. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${business.name} Admin`,
    short_name: "Nail Tek",
    description: `Admin dashboard for ${business.name} — bookings and schedule alerts.`,
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#F5F0E6",
    theme_color: "#111111",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
