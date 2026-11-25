import type { Metadata } from "next";

import { business, serviceCategories } from "@/lib/config/salonData";
import { ServiceList } from "@/components/sections/ServiceList";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description: `Explore the full menu of services at ${business.name}.`,
};

export default function ServicesPage() {
  return (
    <>
      <section className="border-b border-line bg-cream">
        <div className="container py-14 text-center md:py-20">
          <p className="flex items-center justify-center gap-3.5 text-xs uppercase tracking-[0.3em] text-ink-muted before:h-px before:w-9 before:bg-ink before:content-['']">
            Our Menu
          </p>
          <h1 className="mt-4 text-[2.75rem] font-normal leading-none text-ink sm:text-6xl">
            Services &amp; <i className="font-normal text-rose">prices.</i>
          </h1>
          <p className="mx-auto mt-5 max-w-[60ch] text-ink-muted sm:text-[17px]">
            Pedicures, manicures, enhancements, waxing, and lashes. All at
            prices that feel fair. Services marked &ldquo;from&rdquo; can change
            with length, coverage, or design. Walk-ins are always welcome.
          </p>
          <nav aria-label="Service categories" className="mt-8 flex flex-wrap justify-center gap-2">
            {serviceCategories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="rounded-full border-[1.5px] border-line bg-white px-4 py-2 text-[13px] font-bold text-ink transition-colors hover:border-ink"
              >
                {category.name}
              </a>
            ))}
          </nav>
        </div>
      </section>
      <ServiceList />
    </>
  );
}
