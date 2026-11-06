"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { PhoneLink } from "@/components/analytics/PhoneLink";
import { business } from "@/lib/config/salonData";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/gallery", label: "Lookbook" },
  { href: "/services", label: "Services & prices" },
  { href: "/#family", label: "About" },
  { href: "/#careers", label: "Careers" },
  { href: "#contact", label: "Visit" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-300",
        scrolled || menuOpen
          ? "border-line bg-cream/95 backdrop-blur-md"
          : "border-transparent bg-cream"
      )}
    >
      <div className="container grid h-16 grid-cols-[1fr_auto] items-center gap-2 lg:h-20 lg:grid-cols-[1fr_auto_1fr]">
        {/* Desktop nav (left) */}
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-semibold text-ink lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink-muted">
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/" className="flex flex-col leading-none lg:items-center lg:text-center">
          <span className="whitespace-nowrap font-serif text-[19px] tracking-[0.01em] text-ink sm:text-[22px] lg:text-[26px] lg:tracking-[0.02em]">
            {business.name}
          </span>
          <span className="mt-1 whitespace-nowrap text-[9px] uppercase tracking-[0.32em] text-ink-muted sm:text-[10px] sm:tracking-[0.38em]">
            {business.address.city} · {business.address.state}
          </span>
        </Link>

        <div className="flex items-center justify-end gap-2 lg:gap-5">
          <PhoneLink
            placement="header"
            aria-label={`Call ${business.phone}`}
            className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-line px-3 text-[12.5px] font-bold text-ink sm:px-3.5 sm:text-[13px] lg:h-auto lg:border-0 lg:px-0 lg:text-sm"
          >
            <Phone className="hidden size-3.5 sm:block" />
            {business.phone}
          </PhoneLink>
          <Link
            href="/book"
            className="hidden h-11 items-center justify-center rounded-sm bg-ink px-6 text-sm font-bold tracking-[0.02em] text-white transition-colors hover:bg-ink-soft lg:inline-flex"
          >
            Book a visit
          </Link>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-ink lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden border-b border-line bg-cream lg:hidden"
          >
            <nav aria-label="Mobile" className="container flex flex-col py-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-line py-3.5 text-base font-semibold text-ink last:border-0"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/book"
                onClick={() => setMenuOpen(false)}
                className="mt-3 inline-flex h-12 items-center justify-center rounded-sm bg-ink text-sm font-bold text-white"
              >
                Book a visit
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
