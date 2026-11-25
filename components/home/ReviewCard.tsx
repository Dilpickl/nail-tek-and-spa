"use client";

import { useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/** Review that shows its opening lines, with "Read full review" to expand. */
export function ReviewCard({
  quote,
  name,
  source,
  index,
}: {
  quote: string;
  name: string;
  source: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const id = `review-${index}`;

  return (
    <figure
      data-reveal
      style={{ "--rd": `${index * 110}ms` } as CSSProperties}
      className="m-0 border-b border-line py-5 md:border-b-0 md:py-0 md:pt-7 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:pl-7 md:pr-7"
    >
      <blockquote
        id={id}
        className={cn(
          "font-serif text-ink",
          open
            ? "text-[18px] leading-[1.45]"
            : "line-clamp-4 text-[21px] leading-[1.35]"
        )}
      >
        “{quote}”
      </blockquote>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="mt-2.5 border-b-[1.5px] border-rose py-1.5 text-[13px] font-bold text-ink"
      >
        {open ? "Show less" : "Read full review"}
      </button>
      <figcaption className="mt-3 text-[13px] text-ink-muted">
        {name} · {source} <span role="img" aria-label="5 stars">★★★★★</span>
      </figcaption>
    </figure>
  );
}
