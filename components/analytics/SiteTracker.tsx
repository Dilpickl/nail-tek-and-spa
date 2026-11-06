"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { trackPageview } from "@/lib/analytics/visitor";

/** Records a page view on each public route. Admin screens are skipped. */
export function SiteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    trackPageview(pathname);
  }, [pathname]);

  return null;
}
