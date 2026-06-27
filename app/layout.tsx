import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";

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
      </body>
    </html>
  );
}
