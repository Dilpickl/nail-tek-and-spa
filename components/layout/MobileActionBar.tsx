"use client";

import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";

import { PhoneLink } from "@/components/analytics/PhoneLink";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { OpenStatus } from "@/components/home/OpenStatus";

/** Sticky Call / Book bar on phones and tablets (hidden on the booking page). */
export function MobileActionBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/book")) return null;

  return (
    <div className="nt-bar fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 bg-ink px-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2.5 text-white lg:hidden">
      <OpenStatus suffix="walk-ins welcome" className="justify-center text-xs text-[#D9CFC4]" />
      <div className="grid grid-cols-[1fr_1.6fr] gap-2">
        <PhoneLink
          placement="mobile_bar"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border-[1.5px] border-[#5a524b] text-sm font-bold text-[#F5EFE8]"
        >
          <Phone className="size-4" />
          Call
        </PhoneLink>
        <TrackedLink
          href="/book"
          placement="mobile_book"
          className="inline-flex h-12 items-center justify-center rounded-sm bg-[#F5EFE8] text-sm font-bold text-ink"
        >
          Book a visit
        </TrackedLink>
      </div>
    </div>
  );
}
