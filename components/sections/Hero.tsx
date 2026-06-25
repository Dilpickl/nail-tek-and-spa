"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Star, Phone } from "lucide-react";

import { business } from "@/lib/config/salonData";
import { Button } from "@/components/ui/button";

export function Hero() {
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-offwhite px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-ink-soft"
          >
            <Star className="size-3.5 fill-ink text-ink" />
            {business.yearsOfExperience}+ Years of Trusted Craft
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-balance text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl lg:text-6xl"
          >
            Decades of artistry, sanitation &amp; serenity.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted"
          >
            Since {business.establishedYear}, {business.name} has set the
            standard for premium nail care — meticulous technique, hospital-grade
            cleanliness, and a calm escape you can feel the moment you walk in.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8 flex items-center gap-4 text-sm text-ink-muted"
          >
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-ink text-ink" />
              ))}
            </div>
            <span>Loved by generations of clients</span>
          </motion.div>
        </div>

        {/* Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-offwhite shadow-xl ring-1 ring-ink/5">
            <img
              src="https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80"
              alt="A relaxing manicure at the salon"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden rounded-xl bg-offwhite p-5 shadow-lg ring-1 ring-ink/5 sm:block">
            <p className="font-serif text-3xl font-semibold text-ink">
              {business.establishedYear}
            </p>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Family established
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
