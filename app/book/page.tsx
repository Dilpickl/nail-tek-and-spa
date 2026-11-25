import type { Metadata } from "next";

import { getServiceById } from "@/lib/config/salonData";
import { needsNailArtBase } from "@/lib/booking/service-utils";
import { getActiveTechnicians } from "@/lib/booking/technicians";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Book an Appointment",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: { service?: string };
}) {
  const requested = searchParams.service
    ? getServiceById(searchParams.service)
    : undefined;
  // Parents with variants aren't bookable themselves; start on the first variant.
  const firstVariantId = requested?.variants?.[0]?.id;
  const preselected = firstVariantId ? getServiceById(firstVariantId) : requested;
  const needsBase = preselected ? needsNailArtBase([preselected.id]) : false;

  const technicians = await getActiveTechnicians();

  return (
    <section className="py-12 md:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="flex items-center justify-center gap-3.5 text-xs uppercase tracking-[0.3em] text-ink-muted before:h-px before:w-9 before:bg-ink before:content-['']">
            Booking
          </p>
          <h1 className="mt-4 text-[2.5rem] font-normal leading-none text-ink sm:text-6xl">
            Reserve your <i className="font-normal text-rose">visit.</i>
          </h1>

          {preselected && (
            <p className="mt-4 text-lg text-ink-muted">
              You selected <strong className="text-ink">{preselected.name}</strong>.{" "}
              {needsBase
                ? "Pick a manicure, pedicure or set below for it to go on."
                : firstVariantId
                  ? "You can switch options below."
                  : "We'll carry this into your booking."}
            </p>
          )}
        </div>

        <div className="mt-8 md:mt-12">
          <BookingFlow
            preselectedServiceId={preselected?.id}
            technicians={technicians.map((technician) => ({
              id: technician.id,
              name: technician.name,
              role: technician.role,
            }))}
          />
        </div>
      </div>
    </section>
  );
}
