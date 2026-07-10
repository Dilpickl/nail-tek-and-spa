import type { Metadata } from "next";
import Link from "next/link";
import { Calendar } from "lucide-react";

import { business, galleryImages } from "@/lib/config/salonData";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Gallery",
  description: `Browse custom nail art and manicures from ${business.name} in Algonquin.`,
};

export default function GalleryPage() {
  return (
    <>
      <section className="bg-offwhite">
        <div className="container py-16 text-center md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Our Work
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-ink sm:text-5xl">
            Nail art gallery
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-muted">
            A closer look at custom designs from our Algonquin studio — seasonal
            sets, French tips, glitter, and hand-painted art by Travis, Daisy,
            and the team.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/book">
              <Button size="lg">
                <Calendar className="size-5" />
                Book Your Appointment
              </Button>
            </Link>
            <Link href="/services">
              <Button size="lg" variant="outline">
                View services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container">
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {galleryImages.map((image) => (
              <figure
                key={image.src}
                className="mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-offwhite shadow-sm ring-1 ring-ink/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-auto w-full object-cover"
                  loading="lazy"
                />
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
