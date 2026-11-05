"use client";

import { useEffect, useState } from "react";

import { getOpenStatus, type OpenStatus as Status } from "@/lib/salon-hours";
import { cn } from "@/lib/utils";

/**
 * Live "Open today until 8 PM" line. Rendered after mount (and refreshed each
 * minute) so the static page never shows a stale open/closed state.
 */
export function OpenStatus({
  suffix,
  className,
}: {
  /** Extra text after the status, e.g. "walk-ins welcome". */
  suffix?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const update = () => setStatus(getOpenStatus());
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "inline-block size-[7px] shrink-0 rounded-full",
          status ? (status.open ? "bg-[#5BC27A]" : "bg-[#C9A46A]") : "bg-transparent"
        )}
      />
      <span>
        {status ? status.label : "Walk-ins welcome"}
        {status && suffix ? ` · ${suffix}` : ""}
      </span>
    </span>
  );
}
