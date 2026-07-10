import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { NailGallery } from "@/components/sections/NailGallery";
import { ServiceGallery } from "@/components/sections/ServiceGallery";
import { Reviews } from "@/components/sections/Reviews";
import { Careers } from "@/components/sections/Careers";

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <NailGallery />
      <ServiceGallery />
      <Reviews />
      <Careers />
    </>
  );
}
