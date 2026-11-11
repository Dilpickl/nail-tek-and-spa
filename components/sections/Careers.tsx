import { AnimatedTitle } from "@/components/home/AnimatedTitle";
import { careers, business } from "@/lib/config/salonData";

/** Homepage careers block. Relies on the page's <MotionObserver> for reveals. */
export function Careers() {
  return (
    <section id="careers" className="scroll-mt-24 border-t border-line bg-cream">
      <div className="container grid gap-8 pb-16 pt-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-[72px] lg:pb-24 lg:pt-[84px]">
        <div>
          <p data-reveal className="flex items-center gap-3.5 text-xs uppercase tracking-[0.3em] text-ink-muted before:h-px before:w-9 before:bg-ink before:content-['']">
            Careers
          </p>
          <AnimatedTitle
            className="mt-4 text-[34px] font-normal leading-[1.02] text-ink lg:text-[50px]"
            parts={[{ text: "Want to work" }, { text: "with us?", accent: true }]}
          />
          <p data-reveal className="mt-[18px] max-w-[46ch] text-ink-muted">
            We&apos;re a friendly Algonquin team that does good work and treats
            guests like family. If that sounds like you, we&apos;d like to meet.
          </p>
        </div>

        <div className="border-t border-ink">
          {careers.length === 0 && (
            <p data-reveal className="py-6 text-ink-muted">
              Nothing open right now. Check back soon.
            </p>
          )}
          {careers.map((job) => (
            <div
              key={job.id}
              data-reveal
              className="flex flex-col gap-4 border-b border-line py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
            >
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-[26px] font-normal leading-tight text-ink">{job.title}</h3>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-rose">
                    {job.type}
                  </span>
                </div>
                <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-ink-muted">
                  {job.description}
                </p>
              </div>
              <a
                href={
                  business.email
                    ? `mailto:${business.email}?subject=${encodeURIComponent(`Application: ${job.title}`)}`
                    : `tel:${business.phoneRaw}`
                }
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-ink px-6 text-sm font-bold tracking-[0.02em] text-ink transition-colors hover:bg-ink hover:text-white"
              >
                {business.email ? "Apply by email" : "Call to apply"}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
