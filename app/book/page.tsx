import type { Metadata } from "next";

import { getServiceById } from "@/lib/config/salonData";
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
  const preselected = searchParams.service
    ? getServiceById(searchParams.service)
    : undefined;

  const technicians = await getActiveTechnicians();

  return (
    <section className="section-padding">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Booking
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-ink sm:text-5xl">
            Reserve your appointment
          </h1>

          {preselected && (
            <p className="mt-4 text-lg text-ink-muted">
              You selected <strong className="text-ink">{preselected.name}</strong>.
              We'll carry this into your booking.
            </p>
          )}
        </div>

        <div className="mt-12">
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
