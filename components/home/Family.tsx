import Image from "next/image";

import { AnimatedTitle } from "@/components/home/AnimatedTitle";

export function Family() {
  return (
    <section id="family" className="scroll-mt-24 border-t border-line bg-cream">
      <div className="container grid items-center gap-6 pb-5 pt-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-[72px] lg:pb-9 lg:pt-[84px]">
        <figure data-reveal="wipe" className="m-0 w-full lg:max-w-[420px] lg:justify-self-center">
          <div className="relative aspect-square overflow-hidden bg-sand lg:aspect-[4/5]">
            <Image
              src="/images/team.jpg"
              alt="The family behind Nail Tek & Spa"
              fill
              sizes="(min-width: 1024px) 420px, 100vw"
              className="object-cover object-[50%_30%] [filter:saturate(.92)_contrast(1.02)] lg:object-[50%_35%]"
            />
          </div>
          <figcaption className="mt-3 font-serif text-[15px] italic text-ink-muted">
            The family behind Nail Tek &amp; Spa
          </figcaption>
        </figure>
        <div>
          <p data-reveal className="flex items-center gap-3.5 text-xs uppercase tracking-[0.3em] text-ink-muted before:h-px before:w-9 before:bg-ink before:content-['']">
            Family-owned on Randall Road
          </p>
          <AnimatedTitle
            className="mt-4 text-[34px] font-normal leading-[1.02] text-ink lg:text-[50px]"
            parts={[{ text: "A family business," }, { text: "not a chain.", accent: true }]}
          />
          <p data-reveal className="mt-[18px] max-w-[46ch] text-ink-muted">
            Nail Tek &amp; Spa is owned and run by a local family. When you book with
            us, you&apos;re supporting the people doing your nails, not a franchise.
          </p>
          <p data-reveal className="mt-[18px] font-serif text-xl italic text-ink">
            — Travis, Daisy &amp; the Nail Tek team
          </p>
        </div>
      </div>
    </section>
  );
}
