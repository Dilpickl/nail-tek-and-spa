import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { TrackedLink } from "@/components/analytics/TrackedLink";
import { NAIL_ART_SERVICE_ID } from "@/lib/booking/service-utils";
import { business, galleryImages } from "@/lib/config/salonData";

export const metadata: Metadata = {
  title: "Gallery",
  description: `Browse custom nail art and manicures from ${business.name} in Algonquin.`,
};

const bookLook = `/book?service=${NAIL_ART_SERVICE_ID}`;

export default function GalleryPage() {
  return (
    <>
      <section className="border-b border-line bg-cream">
        <div className="container py-14 text-center md:py-20">
          <p className="flex items-center justify-center gap-3.5 text-xs uppercase tracking-[0.3em] text-ink-muted before:h-px before:w-9 before:bg-ink before:content-['']">
            The Lookbook
          </p>
          <h1 className="mt-4 text-[2.75rem] font-normal leading-none text-ink sm:text-6xl">
            {galleryImages.length} looks, <i className="font-normal text-rose">all ours.</i>
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-ink-muted sm:text-[17px]">
            Seasonal sets, French tips, glitter, and hand-painted art from
            Travis, Daisy, and the team. Screenshot a favorite and show us in
            the chair.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-7">
            <TrackedLink
              href={bookLook}
              placement="gallery_book"
              className="inline-flex h-[52px] items-center justify-center rounded-sm bg-ink px-7 text-sm font-bold tracking-[0.02em] text-white transition-colors hover:bg-ink-soft"
            >
              Book a nail art visit
            </TrackedLink>
            <Link
              href="/services"
              className="border-b-[1.5px] border-ink py-1 text-sm font-bold tracking-[0.02em] text-ink"
            >
              Services &amp; prices
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-cream py-10 md:py-16">
        <div className="container">
          <div className="columns-2 gap-2.5 lg:columns-3 lg:gap-3.5 xl:columns-4">
            {galleryImages.map((image, index) => (
              <figure
                key={image.src}
                className="m-0 mb-2.5 break-inside-avoid overflow-hidden bg-sand lg:mb-3.5"
              >
                {/* width/height only reserve space; h-auto keeps each photo's own ratio. */}
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={720}
                  height={960}
                  priority={index < 4}
                  sizes="(min-width: 1280px) 290px, (min-width: 1024px) 320px, 50vw"
                  className="h-auto w-full"
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-[#F5EFE8]">
        <div className="container flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between lg:py-20">
          <div>
            <h2 className="text-[34px] font-normal leading-none lg:text-[46px]">
              See one you like? <i className="font-normal text-rose-light">We&apos;ll paint it.</i>
            </h2>
            <p className="mt-4 max-w-[44ch] text-[#BEB3A7]">
              Show us the photo, or bring your own idea. Custom art is priced in
              the chair, before we start.
            </p>
          </div>
          <TrackedLink
            href={bookLook}
            placement="gallery_book"
            className="inline-flex h-[52px] shrink-0 items-center justify-center rounded-sm bg-[#F5EFE8] px-7 text-sm font-bold tracking-[0.02em] text-ink transition-colors hover:bg-white"
          >
            Book a nail art visit
          </TrackedLink>
        </div>
      </section>
    </>
  );
}
