import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { PhoneLink } from "@/components/analytics/PhoneLink";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { AnimatedTitle } from "@/components/home/AnimatedTitle";
import { business, galleryImages, getServiceById } from "@/lib/config/salonData";
import { cn } from "@/lib/utils";

/** Custom nail art service; "Book this look" and nail-art CTAs preselect it. */
export const NAIL_ART_SERVICE_ID = "addon-art";

interface BoardPhoto {
  src: string;
  alt: string;
  /** Optional "Book this look" chip label. */
  chip?: string;
  /** Height on desktop (px). */
  height: number;
}

function photo(n: string, height: number, chip?: string): BoardPhoto {
  const src = `/gallery/nail-${n}.png`;
  const alt = galleryImages.find((image) => image.src === src)?.alt ?? "Nail art by Nail Tek & Spa";
  return { src, alt, chip, height };
}

// Three staggered columns on desktop.
const COLUMNS: { offset: number; photos: BoardPhoto[] }[] = [
  { offset: 0, photos: [photo("28", 300, "Floral"), photo("01", 220)] },
  { offset: 56, photos: [photo("29", 360, "Holiday"), photo("34", 220)] },
  { offset: 18, photos: [photo("03", 250), photo("31", 300, "Graphic lines")] },
];

// Phone / tablet: one swipeable row, chips first.
const ROW = [COLUMNS[0].photos[0], COLUMNS[1].photos[0], COLUMNS[2].photos[1], COLUMNS[0].photos[1], COLUMNS[1].photos[1], COLUMNS[2].photos[0]];

function minPrice(ids: string[]): number {
  return Math.min(...ids.map((id) => getServiceById(id)?.price ?? Infinity));
}

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function Hero() {
  const fromPrice = minPrice(["wax-eyebrows", "wax-lips", "wax-chin"]);
  const pediFrom = minPrice(["pedi-classic", "pedi-luxury", "pedi-organic", "pedi-volcanic"]);
  const bookLook = `/book?service=${NAIL_ART_SERVICE_ID}`;

  return (
    <section className="bg-cream">
      <div className="container grid gap-10 pb-16 pt-8 md:pt-12 lg:grid-cols-[400px_1fr] lg:gap-14 lg:pb-20 lg:pt-14">
        <div>
          <p className="nt-fi nt-line flex items-center gap-3.5 text-xs uppercase tracking-[0.3em] text-ink-muted before:h-px before:w-9 before:bg-ink before:content-['']">
            The Lookbook · Randall Road
          </p>

          <AnimatedTitle
            as="h1"
            play="load"
            startMs={80}
            paintGapMs={350}
            className="mt-5 text-[3.1rem] font-normal leading-[0.94] tracking-[-0.02em] text-ink sm:text-6xl lg:mt-7 lg:text-[5.25rem]"
            parts={[
              { text: "Your nails," },
              { text: "your way.", accent: true },
              { text: "We'll do the rest." },
            ]}
          />

          <p
            className="nt-fi mt-4 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink min-[390px]:text-[11px] min-[390px]:tracking-[0.12em] sm:text-[13px] sm:tracking-[0.14em] lg:mt-6"
            style={delay(620)}
          >
            Nails <span className="mx-1 text-rose">·</span> Pedicures{" "}
            <span className="mx-1 text-rose">·</span> Waxing{" "}
            <span className="mx-1 text-rose">·</span> Brows &amp; Lashes
          </p>

          <p className="nt-fi mt-4 max-w-[34ch] text-[15.5px] leading-relaxed text-ink-muted sm:text-[17px] lg:mt-6" style={delay(700)}>
            Every set here was done in our chairs on Randall Road. Point at a look,
            describe an idea, or let us design something just for you.
          </p>

          <div
            className="nt-fi mt-6 flex flex-col items-stretch gap-3.5 sm:flex-row sm:items-center sm:gap-7 lg:mt-9"
            style={delay(780)}
          >
            <TrackedLink
              href="/book"
              placement="hero_book"
              className="inline-flex h-[52px] items-center justify-center rounded-sm bg-ink px-7 text-sm font-bold tracking-[0.02em] text-white transition-colors hover:bg-ink-soft"
            >
              Book a visit
            </TrackedLink>
            <Link
              href="/gallery"
              className="self-center border-b-[1.5px] border-ink py-1 text-sm font-bold tracking-[0.02em] text-ink sm:self-auto"
            >
              Browse {galleryImages.length} looks
            </Link>
          </div>

          <p className="nt-fi mt-[18px] hidden text-sm text-ink-muted lg:block" style={delay(860)}>
            Prefer to call?{" "}
            <PhoneLink
              placement="hero"
              className="border-b-[1.5px] border-rose font-bold text-ink"
            >
              {business.phone}
            </PhoneLink>{" "}
            · walk-ins welcome
          </p>

          <div
            className="nt-fi mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 text-[13px] text-ink-muted lg:mt-12"
            style={delay(940)}
          >
            <a href={business.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="group">
              <b className="block font-serif text-[22px] font-medium text-ink">
                {business.googleRating} ★
              </b>
              <span className="group-hover:text-ink">{business.googleReviewCount} Google reviews</span>
            </a>
            <Link href="/services" className="group">
              <b className="block font-serif text-[22px] font-medium text-ink">From ${fromPrice}</b>
              <span className="group-hover:text-ink">Brows · pedis from ${pediFrom}</span>
            </Link>
          </div>
        </div>

        {/* Phone / tablet: swipeable row */}
        <div className="-mx-6 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-6 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
          {ROW.map((item, index) => (
            <BoardTile
              key={item.src}
              item={item}
              index={index}
              href={bookLook}
              className="h-[330px] w-[62%] shrink-0 snap-start sm:h-[380px] sm:w-[40%]"
            />
          ))}
        </div>

        {/* Desktop: staggered three-column board */}
        <div className="hidden grid-cols-3 items-start gap-3.5 lg:grid">
          {COLUMNS.map((column, columnIndex) => (
            <div key={columnIndex} className="grid gap-3.5" style={{ marginTop: column.offset }}>
              {column.photos.map((item, photoIndex) => (
                <BoardTile
                  key={item.src}
                  item={item}
                  index={columnIndex * 2 + photoIndex}
                  number={columnIndex * 2 + photoIndex + 1}
                  href={bookLook}
                  style={{ height: item.height }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BoardTile({
  item,
  index,
  number,
  href,
  className,
  style,
}: {
  item: BoardPhoto;
  index: number;
  number?: number;
  href: string;
  className?: string;
  style?: CSSProperties;
}) {
  const start = index * 95 + 200;
  return (
    <figure
      className={cn("nt-wipe relative m-0 overflow-hidden bg-sand", className)}
      style={{ ...style, ...delay(start) }}
    >
      <Image
        src={item.src}
        alt={item.alt}
        fill
        sizes="(min-width: 1024px) 260px, 62vw"
        className="object-cover"
      />
      {number ? (
        <span
          aria-hidden
          className="nt-after absolute right-3 top-2.5 font-serif text-xl italic text-white [text-shadow:0_1px_8px_rgba(0,0,0,.4)]"
          style={delay(start + 900)}
        >
          {String(number).padStart(2, "0")}
        </span>
      ) : null}
      {item.chip ? (
        <TrackedLink
          href={href}
          placement="look_book"
          className="nt-after absolute bottom-2.5 left-2.5 flex items-center gap-2 rounded-full bg-cream/95 px-3 py-2 text-xs font-bold text-ink shadow-sm transition-colors hover:bg-white"
          style={delay(start + 900)}
        >
          Book this look <span className="font-medium text-ink-muted">{item.chip}</span>
        </TrackedLink>
      ) : null}
    </figure>
  );
}
