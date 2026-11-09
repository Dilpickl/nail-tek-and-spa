"use client";

import { usePathname } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileActionBar, showsMobileActionBar } from "@/components/layout/MobileActionBar";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="site-public flex min-h-screen flex-col">
      <Header />
      {children}
      <Footer reserveActionBarSpace={showsMobileActionBar(pathname)} />
      <MobileActionBar />
    </div>
  );
}
