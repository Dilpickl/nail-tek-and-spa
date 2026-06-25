import { Star } from "lucide-react";

import { business } from "@/lib/config/salonData";
import { Button } from "@/components/ui/button";

/**
 * PLACEHOLDER — Google Review widget.
 *
 * Drop-in slot designed to blend with the brand. Replace the inner markup with
 * a real integration later (e.g. Elfsight, Trustindex, or the Google Places
 * "Reviews" API). The outer card styling can stay as-is so it keeps matching
 * the site. Until then it shows an aggregate rating and a CTA to leave a review.
 */
export function GoogleReviewWidget({
  rating = 4.9,
  reviewCount = 600,
}: {
  rating?: number;
  reviewCount?: number;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl bg-offwhite p-8 text-center ring-1 ring-ink/5">
      {/* Google "G" mark stand-in */}
      <div className="flex items-center gap-2 text-sm font-medium text-ink-muted">
        <span
          className="font-serif text-xl font-bold"
          style={{ color: "#4285F4" }}
          aria-hidden
        >
          G
        </span>
        Google Reviews
      </div>

      <p className="mt-4 font-serif text-5xl font-semibold text-ink">
        {rating.toFixed(1)}
      </p>

      <div className="mt-2 flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={
              i < Math.round(rating)
                ? "size-5 fill-ink text-ink"
                : "size-5 text-ink/20"
            }
          />
        ))}
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        Based on {reviewCount.toLocaleString()}+ reviews
      </p>

      <a
        href={business.googleReviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 w-full"
      >
        <Button variant="outline" className="w-full">
          Leave us a review
        </Button>
      </a>

      {/* Dev hint — not shown to users in a meaningful way, kept subtle */}
      <p className="mt-4 text-[11px] text-ink-muted/60">
        Connect a live Google Reviews feed here.
      </p>
    </div>
  );
}
