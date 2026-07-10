import type { Metadata } from "next";

import { business } from "@/lib/config/salonData";
import { ServiceList } from "@/components/sections/ServiceList";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description: `Explore the full menu of services at ${business.name}.`,
};

export default function ServicesPage() {
  return (
    <>
      <section className="bg-offwhite">
        <div className="container py-16 text-center md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Our Menu
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-ink sm:text-5xl">
            Services & Pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-muted">
            Premium pedicures, manicures, enhancements, waxing, and lash
            services — all at highly affordable prices. Some services marked
            &ldquo;from&rdquo; may vary with length, coverage, or design.
            Walk-ins are always welcome.
          </p>
        </div>
      </section>
      <ServiceList />
    </>
  );
}
