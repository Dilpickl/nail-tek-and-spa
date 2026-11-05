import type { Metadata } from "next";

import { BeyondNails } from "@/components/home/BeyondNails";
import { Family } from "@/components/home/Family";
import { Hero } from "@/components/home/Hero";
import { MotionObserver } from "@/components/home/MotionObserver";
import { NailArt } from "@/components/home/NailArt";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { Careers } from "@/components/sections/Careers";
import { business } from "@/lib/config/salonData";

export const metadata: Metadata = {
  title: {
    absolute: `${business.name} | Nail Salon, Waxing & Lashes in Algonquin, IL`,
  },
  description:
    "Family-owned nail salon on Randall Road in Algonquin, IL. Custom nail art, spa pedicures, no-chip manicures, waxing, brows and lashes. Book online or call (847) 458-4560. Walk-ins welcome.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <BeyondNails />
      <NailArt />
      <Family />
      <ReviewsSection />
      <Careers />
      <MotionObserver />
    </>
  );
}
