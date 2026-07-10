import { ExternalLink, ThumbsUp } from "lucide-react";

import { business, socials } from "@/lib/config/salonData";
import { Button } from "@/components/ui/button";

/**
 * Facebook Reviews summary — recommend % and count from salonData (keep in sync
 * with the live Facebook page). Links out to the salon profile.
 */
export function FacebookReviewWidget() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl bg-background p-8 text-center ring-1 ring-ink/5 lg:bg-offwhite">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-muted">
        <span
          className="inline-flex size-7 items-center justify-center rounded-full bg-white text-sm font-bold shadow-sm ring-1 ring-ink/10"
          style={{ color: "#1877F2" }}
          aria-hidden
        >
          f
        </span>
        Facebook Reviews
      </div>

      <p className="mt-4 font-serif text-5xl font-semibold text-ink">
        {business.facebookRecommendPercent}%
      </p>

      <div className="mt-2 flex items-center gap-1.5 text-ink">
        <ThumbsUp className="size-5 fill-ink text-ink" aria-hidden />
        <span className="text-sm font-medium">recommend</span>
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        ({business.facebookReviewCount.toLocaleString()} Reviews)
      </p>

      <a
        href={socials.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 w-full"
      >
        <Button variant="outline" className="w-full">
          See us on Facebook
          <ExternalLink className="size-4" />
        </Button>
      </a>
    </div>
  );
}
