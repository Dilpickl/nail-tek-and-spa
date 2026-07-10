import Link from "next/link";
import { Phone, Mail, MapPin, Clock, Facebook, Instagram } from "lucide-react";

import { business, hours, socials } from "@/lib/config/salonData";

export function Footer() {
  const { address } = business;

  return (
    <footer id="contact" className="bg-ink text-beige-100">
      <div className="container py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr_1fr]">
          {/* Brand + contact */}
          <div>
            <h3 className="font-serif text-2xl text-offwhite">{business.name}</h3>
            <p className="mt-2 text-sm text-beige-300/80 max-w-sm">
              {business.footerDescription}
            </p>

            <div className="mt-6 space-y-3 text-sm">
              <a
                href={`tel:${business.phoneRaw}`}
                className="flex items-center gap-3 hover:text-offwhite transition-colors"
              >
                <Phone className="size-4 shrink-0" />
                {business.phone}
              </a>
              {business.email ? (
                <a
                  href={`mailto:${business.email}`}
                  className="flex items-center gap-3 hover:text-offwhite transition-colors"
                >
                  <Mail className="size-4 shrink-0" />
                  {business.email}
                </a>
              ) : null}
              <p className="flex items-start gap-3">
                <MapPin className="size-4 shrink-0 mt-0.5" />
                <span>
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  <br />
                  {address.city}, {address.state} {address.zip}
                </span>
              </p>
              {(business.walkInsWelcome || business.giftCardsAvailable) && (
                <p className="text-beige-300/80 pt-1">
                  {[
                    business.walkInsWelcome ? "Walk-ins welcome" : null,
                    business.giftCardsAvailable ? "Gift cards available" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <a
                href={socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="inline-flex size-10 items-center justify-center rounded-full border border-beige-300/30 hover:bg-offwhite hover:text-ink transition-colors"
              >
                <Facebook className="size-4" />
              </a>
              <a
                href={socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex size-10 items-center justify-center rounded-full border border-beige-300/30 hover:bg-offwhite hover:text-ink transition-colors"
              >
                <Instagram className="size-4" />
              </a>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="flex items-center gap-2 font-serif text-lg text-offwhite">
              <Clock className="size-4" /> Hours
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {hours.map((h) => (
                <li key={h.day} className="flex justify-between gap-4">
                  <span className="text-beige-300/80">{h.day}</span>
                  <span
                    className={h.open ? "text-beige-100" : "text-beige-300/50"}
                  >
                    {h.hours}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Map */}
          <div>
            <h4 className="font-serif text-lg text-offwhite">Find Us</h4>
            <div className="mt-4 overflow-hidden rounded-lg border border-beige-300/20">
              <iframe
                title={`${business.name} location`}
                src={business.googleMapsEmbedUrl}
                width="100%"
                height="200"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-beige-300/20 pt-6">
          <div className="flex flex-col items-center gap-4 text-center text-xs text-beige-300/70 md:flex-row md:items-center md:justify-between md:text-left">
            <p>
              &copy; {new Date().getFullYear()} {business.name}. All rights
              reserved.
            </p>
            <div className="flex justify-center gap-6">
              <Link href="/terms" className="hover:text-offwhite transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-offwhite transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-beige-300/60">
            Interested in a professional website? Text inquiries to{" "}
            <a
              href="sms:+18153457343"
              className="underline hover:text-offwhite transition-colors"
            >
              815-345-7343
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
