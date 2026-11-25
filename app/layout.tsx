import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Bodoni_Moda, Cormorant_Garamond, Inter, Manrope } from "next/font/google";

import { SiteTracker } from "@/components/analytics/SiteTracker";
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

/** Public-site fonts (the admin keeps Inter / Cormorant). */
const display = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
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
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Lets scroll-reveal styles hide content only when JS can reveal it again.
            Also turns on holiday decorations Nov 1 – Jan 31 (months 10, 11, 0). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "var d=document.documentElement,m=new Date().getMonth();d.dataset.js='1';if(m>9||m<1)d.dataset.holiday='1'",
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <SiteTracker />
        <SiteChrome>
          <main className="flex-1">{children}</main>
        </SiteChrome>
        <Analytics />
      </body>
    </html>
  );
}
