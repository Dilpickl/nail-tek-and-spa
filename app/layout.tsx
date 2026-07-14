import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';

import { business } from "@/lib/config/salonData";
import { SiteChrome } from "@/components/layout/SiteChrome";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${business.name} — ${business.tagline}`,
    template: `%s | ${business.name}`,
  },
  description: business.shortDescription,
  applicationName: business.name,
  appleWebApp: {
    capable: true,
    title: `${business.name} Admin`,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: business.name,
    description: business.shortDescription,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen flex flex-col">
        <SiteChrome>
          <main className="flex-1">{children}</main>
        </SiteChrome>
        <Analytics />
      </body>
    </html>
  );
}
