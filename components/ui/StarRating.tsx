import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  max?: number;
  className?: string;
  starClassName?: string;
}

/** Snap to nearest half star for display (e.g. 4.4 → 4.5). */
function toHalfStarDisplay(rating: number): number {
  return Math.round(rating * 2) / 2;
}

/** Renders star fills in half-star steps (e.g. 4.4 → four full + one half). */
export function StarRating({
  rating,
  max = 5,
  className,
  starClassName = "size-5",
}: StarRatingProps) {
  const clamped = Math.min(Math.max(rating, 0), max);
  const displayRating = toHalfStarDisplay(clamped);

  return (
    <div
      className={cn("flex", className)}
      aria-label={`${clamped.toFixed(1)} out of ${max} stars`}
    >
      {Array.from({ length: max }).map((_, index) => {
        const fill = Math.min(Math.max(displayRating - index, 0), 1);

        return (
          <span key={index} className={cn("relative inline-flex", starClassName)}>
            <Star className={cn(starClassName, "text-ink/20")} />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
                aria-hidden
              >
                <Star className={cn(starClassName, "fill-ink text-ink")} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
