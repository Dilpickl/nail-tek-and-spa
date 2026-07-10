import { Star, Quote } from "lucide-react";

import { testimonials } from "@/lib/config/salonData";
import { Reveal } from "@/components/ui/reveal";
import { GoogleReviewWidget } from "@/components/sections/GoogleReviewWidget";
import { FacebookReviewWidget } from "@/components/sections/FacebookReviewWidget";

export function Reviews() {
  return (
    <section className="section-padding bg-offwhite">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Loved by our clients
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Real reviews from Crystal Lake & beyond
          </h2>
        </Reveal>
      </div>

      {/* Mobile: swipe testimonials, then compact Google / Facebook cards */}
      <div className="mt-10 md:hidden">
        <Reveal>
          <div className="h-scroll">
            {testimonials.map((t, i) => (
              <figure
                key={`${t.name}-${i}`}
                className="h-scroll-item flex flex-col rounded-2xl bg-background p-6 ring-1 ring-ink/5"
              >
                <Quote className="size-6 text-ink/30" />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center justify-between gap-3">
                  <span>
                    <span className="font-medium text-ink">{t.name}</span>
                    {t.source && (
                      <span className="mt-0.5 block text-xs text-ink-muted">
                        {t.source}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="size-3.5 fill-ink text-ink" />
                    ))}
                  </span>
                </figcaption>
              </figure>
            ))}
            <div className="h-scroll-item">
              <GoogleReviewWidget compact />
            </div>
            <div className="h-scroll-item">
              <FacebookReviewWidget compact />
            </div>
          </div>
        </Reveal>
      </div>

      {/* Desktop: widgets + review grid */}
      <div className="container mt-12 hidden items-start gap-8 md:grid lg:grid-cols-[1fr_1.3fr]">
        <Reveal>
          <div className="space-y-4">
            <GoogleReviewWidget />
            <FacebookReviewWidget />
          </div>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={`${t.name}-${i}`} delay={i * 0.07}>
              <figure className="flex h-full flex-col rounded-2xl bg-background p-6 ring-1 ring-ink/5">
                <Quote className="size-6 text-ink/30" />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft sm:text-base">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center justify-between gap-3">
                  <span>
                    <span className="font-medium text-ink">{t.name}</span>
                    {t.source && (
                      <span className="mt-0.5 block text-xs text-ink-muted">
                        {t.source}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0">
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
    </section>
  );
}
