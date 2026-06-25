import { Star, Quote } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { GoogleReviewWidget } from "@/components/sections/GoogleReviewWidget";

/**
 * Placeholder testimonials. Replace with real client quotes (or wire the
 * GoogleReviewWidget to a live feed).
 */
const testimonials = [
  {
    quote:
      "I've been coming here for 15 years. The care and attention to cleanliness is unmatched — it always feels like a treat.",
    name: "Sandra M.",
  },
  {
    quote:
      "Linh is a true artist. My gel manicure lasted three full weeks without a single chip. Worth every penny.",
    name: "Priya K.",
  },
  {
    quote:
      "The spa pedicure is the most relaxing hour of my month. Spotlessly clean and so welcoming.",
    name: "Diane R.",
  },
];

export function Reviews() {
  return (
    <section className="section-padding bg-offwhite">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Loved by our clients
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Generations of five-star care
          </h2>
        </Reveal>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <GoogleReviewWidget />
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.07}>
                <figure className="flex h-full flex-col rounded-2xl bg-background p-6 ring-1 ring-ink/5">
                  <Quote className="size-6 text-ink/30" />
                  <blockquote className="mt-3 flex-1 leading-relaxed text-ink-soft">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-4 flex items-center justify-between">
                    <span className="font-medium text-ink">{t.name}</span>
                    <span className="flex">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="size-3.5 fill-ink text-ink" />
                      ))}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
