import { Briefcase, ArrowRight } from "lucide-react";

import { PhoneLink } from "@/components/analytics/PhoneLink";
import { careers, business } from "@/lib/config/salonData";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function Careers() {
  return (
    <section id="careers" className="section-padding">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Careers
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Want to work with us?
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            We&apos;re a friendly Algonquin team that does good work and treats
            guests like family. If that sounds like you, we&apos;d like to meet.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 max-w-3xl space-y-4">
          {careers.length === 0 && (
            <p className="text-center text-ink-muted">
              Nothing open right now. Check back soon.
            </p>
          )}
          {careers.map((job, i) => (
            <Reveal key={job.id} delay={i * 0.06}>
              <div className="flex flex-col gap-4 rounded-2xl bg-offwhite p-6 ring-1 ring-ink/5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink text-offwhite">
                    <Briefcase className="size-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-ink">
                        {job.title}
                      </h3>
                      <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-medium text-ink-soft">
                        {job.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                      {job.description}
                    </p>
                  </div>
                </div>
                {business.email ? (
                  <a href={`mailto:${business.email}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}>
                    <Button variant="outline" className="w-full sm:w-auto">
                      Apply
                      <ArrowRight className="size-4" />
                    </Button>
                  </a>
                ) : (
                  <PhoneLink placement="careers">
                    <Button variant="outline" className="w-full sm:w-auto">
                      Call to Apply
                      <ArrowRight className="size-4" />
                    </Button>
                  </PhoneLink>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
