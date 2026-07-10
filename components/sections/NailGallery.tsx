"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

import { galleryImages } from "@/lib/config/salonData";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

const HOME_PREVIEW_COUNT = 12;

/** Home-page horizontal scroll of salon nail art, with CTA to the full gallery. */
export function NailGallery() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const preview = galleryImages.slice(0, HOME_PREVIEW_COUNT);

  function scrollBy(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.75, 360);
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <section id="gallery" className="section-padding bg-background">
      <div className="container">
        <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
              Our Work
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
              Nail art gallery
            </h2>
            <p className="mt-2 text-ink-muted">
              Custom designs from classic French tips to seasonal art — scroll
              through a few favorites from Travis, Daisy, and the team.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label="Scroll gallery left"
                className="inline-flex size-10 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:bg-secondary"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label="Scroll gallery right"
                className="inline-flex size-10 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:bg-secondary"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
            <Link href="/gallery">
              <Button variant="outline">
                View full gallery
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>

      <div className="mt-10">
        <div
          ref={scrollerRef}
          className="h-scroll"
        >
          {preview.map((image) => (
            <figure
              key={image.src}
              className="relative h-scroll-item overflow-hidden rounded-2xl bg-offwhite shadow-sm ring-1 ring-ink/5 sm:w-[16rem] sm:max-w-none"
            >
              <div className="aspect-[4/5] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
            </figure>
          ))}
          <Link
            href="/gallery"
            className="h-scroll-item flex flex-col items-center justify-center gap-3 rounded-2xl bg-offwhite px-6 text-center ring-1 ring-ink/5 transition-colors hover:bg-secondary sm:w-[16rem] sm:max-w-none"
          >
            <span className="text-lg font-semibold text-ink">See all {galleryImages.length} looks</span>
            <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
              Open full gallery
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
