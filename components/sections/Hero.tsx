"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Star, Phone, Gift } from "lucide-react";

import { business, socials } from "@/lib/config/salonData";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/StarRating";

export function Hero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const fadeUp = (delay = 0) =>
    ready
      ? {
          initial: { opacity: 0, y: 20 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
        }
      : { initial: false as const, animate: { opacity: 1, y: 0 } as const };

  return (
    <section className="relative overflow-hidden">
      {/* Soft decorative gradient wash */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-secondary/50 blur-3xl" />
      </div>

      <div className="container grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2 lg:gap-8">
        <div>
          <motion.div
            {...fadeUp()}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-offwhite px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-ink-soft"
          >
            <Star className="size-3.5 fill-ink text-ink" />
            Crystal Lake&apos;s premier nail destination
          </motion.div>

          <motion.h1
            {...fadeUp(0.05)}
            className="mt-6 text-balance text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl lg:text-6xl"
          >
            Premium nails.
            <br />
            Refreshing prices.
          </motion.h1>

          <motion.p
            {...fadeUp(0.12)}
            className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted"
          >
            {business.shortDescription}
          </motion.p>

          <motion.div
            {...fadeUp(0.2)}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link href="/book">
              <Button size="lg" className="w-full sm:w-auto">
                <Calendar className="size-5" />
                Book Your Appointment
              </Button>
            </Link>
            <a href={`tel:${business.phoneRaw}`}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Phone className="size-5" />
                {business.phone}
              </Button>
            </a>
          </motion.div>

          <motion.div
            {...fadeUp(0.3)}
            className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted"
          >
            {/* Compact reviews on mobile — desktop uses the floating card */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:hidden">
              <span className="inline-flex items-center gap-1.5">
                <StarRating rating={business.googleRating} starClassName="size-3.5" />
                {business.googleRating.toFixed(1)} Google
              </span>
              <a
                href={socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
              >
                <span
                  className="inline-flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                  style={{ backgroundColor: "#1877F2" }}
                  aria-hidden
                >
                  f
                </span>
                {business.facebookRecommendPercent}% recommend
              </a>
            </div>
            {business.walkInsWelcome && (
              <span className="inline-flex items-center gap-1.5">
                Walk-ins welcome
              </span>
            )}
            {business.giftCardsAvailable && (
              <span className="inline-flex items-center gap-1.5">
                <Gift className="size-3.5" />
                Gift cards available
              </span>
            )}
          </motion.div>
        </div>

        {/* Visual */}
        <motion.div
          initial={ready ? { opacity: 0, scale: 0.97 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-offwhite shadow-xl ring-1 ring-ink/5">
            <img
              src="https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80"
              alt="A relaxing manicure at Nail Tek & Spa"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 left-4 right-4 hidden rounded-xl bg-offwhite/95 p-4 shadow-lg ring-1 ring-ink/5 backdrop-blur-sm sm:left-auto sm:right-auto sm:-bottom-6 sm:-left-6 sm:block sm:w-[15.5rem] sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <StarRating rating={business.googleRating} starClassName="size-3.5" />
                <span className="text-lg font-semibold leading-none text-ink">
                  {business.googleRating.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-ink-muted">Google</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {business.googleReviewCount}+ reviews
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink/8 pt-3">
              <a
                href={socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink transition-colors"
              >
                <span
                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: "#1877F2" }}
                  aria-hidden
                >
                  f
                </span>
                {business.facebookRecommendPercent}% recommend
              </a>
              <span className="shrink-0 text-xs text-ink-muted">
                {business.facebookReviewCount} reviews
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
