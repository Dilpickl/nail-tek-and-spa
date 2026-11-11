"use client";

import type { ReactNode } from "react";

import type { CallPlacement } from "@/lib/analytics/collect";
import { trackCallClick } from "@/lib/analytics/visitor";
import { business } from "@/lib/config/salonData";

export function PhoneLink({
  placement,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  placement: CallPlacement;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <a
      href={`tel:${business.phoneRaw}`}
      className={className}
      aria-label={ariaLabel}
      onClick={() => trackCallClick(placement)}
    >
      {children}
    </a>
  );
}
