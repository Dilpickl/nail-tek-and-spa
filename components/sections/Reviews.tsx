import { testimonials } from "@/lib/config/salonData";
import { Reveal } from "@/components/ui/reveal";
import { GoogleReviewWidget } from "@/components/sections/GoogleReviewWidget";
import { FacebookReviewWidget } from "@/components/sections/FacebookReviewWidget";
import { TestimonialCard } from "@/components/sections/TestimonialCard";

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
          <div className="h-scroll items-start">
            {testimonials.map((t, i) => (
              <TestimonialCard
                key={`${t.name}-${i}`}
                testimonial={t}
                collapsible
                className="h-scroll-item"
              />
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
              <TestimonialCard
                testimonial={t}
                className="h-full"
                quoteClassName="flex-1 sm:text-base"
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
