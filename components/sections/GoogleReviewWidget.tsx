import { ExternalLink } from "lucide-react";

import { business } from "@/lib/config/salonData";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/StarRating";

/**
 * Google Reviews summary card — rating and count from salonData (keep in sync
 * with the live Google Business Profile). Links out to Maps / Write a review.
 */
export function GoogleReviewWidget() {
  const { googleRating: rating, googleReviewCount: reviewCount } = business;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl bg-background p-8 text-center ring-1 ring-ink/5 lg:bg-offwhite">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-muted">
        <span
          className="inline-flex size-7 items-center justify-center rounded-full bg-white text-sm font-bold shadow-sm ring-1 ring-ink/10"
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

      <StarRating rating={rating} className="mt-2" />

      <p className="mt-2 text-sm text-ink-muted">
        Based on {reviewCount.toLocaleString()} Google reviews
      </p>

      <div className="mt-6 flex w-full flex-col gap-2">
        <a
          href={business.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button variant="outline" className="w-full">
            Read our Google reviews
            <ExternalLink className="size-4" />
          </Button>
        </a>
        <a
          href={business.googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button className="w-full">Leave us a review</Button>
        </a>
      </div>
    </div>
  );
}
