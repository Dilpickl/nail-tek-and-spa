import Link from "next/link";

import { allServices } from "@/lib/config/salonData";
import { formatServiceDisplayPrice } from "@/lib/booking/pricing";
import { formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

/** Home-page highlight: a curated grid of featured services. */
export function ServiceGallery() {
  const featured = allServices.filter((s) => s.featured);

  return (
    <section id="services" className="section-padding bg-offwhite">
      <div className="container">
        <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
              Our Services
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
              Signature treatments for every visit
            </h2>
            <p className="mt-2 text-ink-muted">
              Spa pedicures, lasting color, and custom nail art — priced to feel
              as good as they look.
            </p>
          </div>
          <Link href="/services">
            <Button variant="outline">View full menu</Button>
          </Link>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((service, i) => (
            <Reveal key={service.id} delay={(i % 3) * 0.08}>
              <div className="group flex h-full flex-col rounded-2xl bg-background p-7 ring-1 ring-ink/5 transition-shadow hover:shadow-lg">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-xl font-semibold text-ink">
                    {service.name}
                  </h3>
                  <span className="shrink-0 font-serif text-2xl font-semibold text-ink">
                    {formatServiceDisplayPrice(service)}
                  </span>
                </div>
                <p className="mt-3 flex-1 leading-relaxed text-ink-muted">
                  {service.description}
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm text-ink-muted">
                    {formatDuration(service.durationMinutes)}
                  </span>
                  <Link
                    href={`/book?service=${service.variants?.[0]?.id ?? service.id}`}
                  >
                    <Button size="sm">Book This</Button>
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
