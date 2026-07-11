"use client";

import { useState } from "react";
import { Star, Quote } from "lucide-react";

import type { Testimonial } from "@/lib/config/salonData";
import { cn } from "@/lib/utils";

/** Only unusually long quotes (e.g. Mary) collapse on mobile. */
const COLLAPSE_AT = 480;

/**
 * Shared mobile card height — roughly the pre-Mary carousel size
 * (driven by the longer Google reviews like Jozie / Samantha).
 */
const MOBILE_CARD_HEIGHT = "h-[25rem]";

export function TestimonialCard({
  testimonial,
  className,
  quoteClassName,
  collapsible = false,
  equalHeight = false,
}: {
  testimonial: Testimonial;
  className?: string;
  quoteClassName?: string;
  collapsible?: boolean;
  /** Lock cards to a shared mobile height (unless a long quote is expanded). */
  equalHeight?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = collapsible && testimonial.quote.length > COLLAPSE_AT;
  const clamped = canCollapse && !expanded;

  return (
    <figure
      className={cn(
        "flex flex-col rounded-2xl bg-background p-6 ring-1 ring-ink/5",
        equalHeight && !expanded && MOBILE_CARD_HEIGHT,
        equalHeight && expanded && "min-h-[25rem]",
        className
      )}
    >
      <Quote className="size-6 shrink-0 text-ink/30" />
      <blockquote
        className={cn(
          "mt-3 text-sm leading-relaxed text-ink-soft",
          equalHeight && "flex-1",
          clamped && "line-clamp-10",
          quoteClassName
        )}
      >
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      {canCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 self-start text-sm font-medium text-ink underline-offset-2 hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
      <figcaption className="mt-4 flex items-center justify-between gap-3">
        <span>
          <span className="font-medium text-ink">{testimonial.name}</span>
          {testimonial.source ? (
            <span className="mt-0.5 block text-xs text-ink-muted">
              {testimonial.source}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0">
          {Array.from({ length: 5 }).map((_, j) => (
            <Star key={j} className="size-3.5 fill-ink text-ink" />
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
