import Link from "next/link";

import { serviceCategories } from "@/lib/config/salonData";
import { formatPrice, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

/** Full, categorized service menu used on the /services page. */
export function ServiceList() {
  return (
    <div className="container space-y-16 py-16 md:py-20">
      {serviceCategories.map((category) => (
        <section key={category.id} id={category.id} className="scroll-mt-24">
          <Reveal>
            <div className="border-b border-border pb-4">
              <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
                {category.name}
              </h2>
              <p className="mt-1 text-ink-muted">{category.blurb}</p>
            </div>
          </Reveal>

          <div className="mt-6 divide-y divide-border">
            {category.services.map((service) => (
              <div
                key={service.id}
                className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-ink">
                      {service.name}
                    </h3>
                    <span className="text-sm text-ink-muted">
                      · {formatDuration(service.durationMinutes)}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-muted">{service.description}</p>
                </div>
                <div className="flex items-center gap-5 sm:flex-col sm:items-end sm:gap-2">
                  <span className="font-serif text-2xl font-semibold text-ink">
                    {formatPrice(service.price)}
                  </span>
                  <Link href={`/book?service=${service.id}`}>
                    <Button size="sm">Book This</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
