import { AnimatedTitle } from "@/components/home/AnimatedTitle";
import { ReviewCard } from "@/components/home/ReviewCard";
import { business, testimonials } from "@/lib/config/salonData";

// Opening lines that work best right after the family section.
const FEATURED = ["Samantha F.", "Jozie T.", "Julie T."];

export function ReviewsSection() {
  const featured = FEATURED.map((name) => testimonials.find((t) => t.name === name)).filter(
    (t): t is (typeof testimonials)[number] => Boolean(t)
  );

  return (
    <section id="reviews" className="scroll-mt-24 bg-cream">
      <div className="container pb-16 pt-12 lg:pb-24 lg:pt-[84px]">
        <div className="mb-6 flex flex-col items-start gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
          <AnimatedTitle
            className="text-[34px] font-normal text-ink md:text-[46px]"
            parts={[{ text: "In their words" }]}
          />
          <a
            data-reveal
            href={business.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b-[1.5px] border-ink py-1 text-sm font-bold text-ink"
          >
            Read all {business.googleReviewCount} on Google
          </a>
        </div>
        <div className="grid border-t border-ink md:grid-cols-3">
          {featured.map((review, i) => (
            <ReviewCard key={review.name} index={i} quote={review.quote} name={review.name} source={review.source ?? "Google"} />
          ))}
        </div>
      </div>
    </section>
  );
}
