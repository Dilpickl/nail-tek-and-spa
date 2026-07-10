import { Sparkles, ShieldCheck, Leaf } from "lucide-react";

import { trustPillars, business } from "@/lib/config/salonData";
import { Reveal } from "@/components/ui/reveal";

const icons = [Sparkles, ShieldCheck, Leaf];

export function About() {
  return (
    <section id="about" className="section-padding">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            About Us
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Quality you can feel — prices you&apos;ll love
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            At {business.name}, every visit is designed to feel welcoming and
            unhurried. Our spacious Algonquin salon specializes in custom nail
            art, restorative spa pedicures, and lasting color — all delivered
            by a team known for kindness, skill, and treating guests like family.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {trustPillars.map((pillar, i) => {
            const Icon = icons[i % icons.length];
            return (
              <Reveal key={pillar.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl bg-offwhite p-8 ring-1 ring-ink/5 transition-shadow hover:shadow-md">
                  <div className="inline-flex size-12 items-center justify-center rounded-xl bg-ink text-offwhite">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-ink">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-ink-muted">
                    {pillar.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
