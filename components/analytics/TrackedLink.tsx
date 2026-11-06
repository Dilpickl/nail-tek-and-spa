"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { CtaPlacement } from "@/lib/analytics/collect";
import { trackCta } from "@/lib/analytics/visitor";

export function TrackedLink({
  href,
  placement,
  className,
  children,
  onClick,
}: {
  href: string;
  placement: CtaPlacement;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        trackCta(placement);
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}
