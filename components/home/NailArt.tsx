import type { CSSProperties } from "react";
import Image from "next/image";
import { TrackedLink } from "@/components/analytics/TrackedLink";

import { AnimatedTitle } from "@/components/home/AnimatedTitle";
import { NAIL_ART_SERVICE_ID } from "@/lib/booking/service-utils";
import { galleryImages } from "@/lib/config/salonData";

const WAYS = [
  { label: "Show us a picture", detail: "Pinterest, Instagram, a friend's hands" },
  { label: "Describe an idea", detail: "colors, a theme, the occasion" },
  { label: "Let us freestyle", detail: "tell us the mood, we'll design it" },
];

const EXAMPLES = [
  { n: "09", kicker: "From a photo", quote: "“this one, for the holidays”", position: "50% 50%" },
  { n: "49", kicker: "From an idea", quote: "“Minnie Mouse, but make it chic”", position: "28% 50%" },
  { n: "45", kicker: "Freestyle", quote: "“something wintry, surprise me”", position: "50% 50%" },
];

const stagger = (i: number) => ({ "--rd": `${i * 110}ms` }) as CSSProperties;

export function NailArt() {
  return (
    <section className="bg-ink text-[#F5EFE8]">
      <div className="container grid items-center gap-9 py-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:py-24">
        <div>
          <AnimatedTitle
            className="text-[40px] font-normal leading-none text-[#F5EFE8] lg:text-6xl"
            parts={[
              { text: "However you dream it up," },
              { text: "we can paint it.", accent: true },
            ]}
          />
          <p data-reveal className="mt-5 max-w-[40ch] text-[#BEB3A7]">
            Bring a photo, give us a few words, or hand over the brush. Travis and
            Daisy do custom designs every day, and it&apos;s the thing regulars mention
            most in their reviews.
          </p>
          <ol className="mt-8 grid gap-4">
            {WAYS.map((way, i) => (
              <li key={way.label} data-reveal style={stagger(i)} className="flex items-baseline gap-4">
                <span className="w-6 font-serif text-[22px] italic text-rose-light">
                  {["i.", "ii.", "iii."][i]}
                </span>
                <span>
                  <b>{way.label}</b> · {way.detail}
                </span>
              </li>
            ))}
          </ol>
          <div data-reveal className="mt-9">
            <TrackedLink
              href={`/book?service=${NAIL_ART_SERVICE_ID}`}
              placement="nailart_book"
              className="inline-flex h-[52px] items-center justify-center rounded-sm bg-[#F5EFE8] px-7 text-sm font-bold tracking-[0.02em] text-ink transition-colors hover:bg-white"
            >
              Book a nail art visit
            </TrackedLink>
          </div>
        </div>

        <div className="grid grid-cols-3 items-start gap-2 lg:gap-3.5">
          {EXAMPLES.map((example, i) => {
            const src = `/gallery/nail-${example.n}.png`;
            const alt = galleryImages.find((image) => image.src === src)?.alt ?? "Custom nail art";
            return (
              <figure
                key={example.n}
                data-reveal="photo"
                style={stagger(i)}
                className={`m-0 ${i === 1 ? "mt-6 lg:mt-12" : ""}`}
              >
                <div className="relative h-[170px] overflow-hidden bg-[#2a2725] sm:h-[260px] lg:h-[330px]">
                  <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 220px, 30vw" className="object-cover"
                    style={{ objectPosition: example.position }}
                  />
                </div>
                <figcaption className="mt-3 font-serif text-[13px] italic leading-snug text-[#E9DED3] lg:text-[17px]">
                  <span className="mb-1.5 block font-sans text-[9px] font-bold not-italic uppercase tracking-[0.14em] text-rose-light lg:text-[11px] lg:tracking-[0.18em]">
                    {example.kicker}
                  </span>
                  {example.quote}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
