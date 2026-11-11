"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import type { CtaPlacement } from "@/lib/analytics/collect";
import { trackCta } from "@/lib/analytics/visitor";

/** next/link that records a booking-button tap before navigating. */
export function TrackedLink({
  placement,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { placement: CtaPlacement }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackCta(placement);
        onClick?.(event);
      }}
    />
  );
}
