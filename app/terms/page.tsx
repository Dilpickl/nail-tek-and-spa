import type { Metadata } from "next";

import { business, legal } from "@/lib/config/salonData";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <article className="container max-w-3xl py-16 md:py-20">
      <h1 className="text-4xl font-semibold text-ink">Terms of Service</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Last updated: {legal.lastUpdated}
      </p>

      <div className="prose-salon mt-8 space-y-6 text-ink-soft leading-relaxed">
        <p>
          These Terms of Service govern your use of the website and booking
          services provided by {legal.businessLegalName} (&ldquo;{business.name}
          ,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By
          booking an appointment or using our website, you agree to these terms.
        </p>

        <Section title="Appointments &amp; Cancellations">
          When you book an appointment, you agree to provide accurate contact
          information. We kindly ask that you cancel or reschedule at least 24
          hours in advance. Repeated no-shows may require a deposit for future
          bookings.
        </Section>

        <Section title="Messaging Consent">
          By creating an appointment, you agree to receive automated
          transactional and booking reminder text messages from {business.name}.
          Message and data rates may apply. You can opt out at any time by
          replying STOP.
        </Section>

        <Section title="Services &amp; Pricing">
          Prices listed are starting points and may vary based on nail length,
          design complexity, and product selection. Final pricing will be
          confirmed at your appointment.
        </Section>

        <Section title="Liability">
          Please inform your technician of any allergies, sensitivities, or
          medical conditions before service. {business.name} is not liable for
          reactions arising from undisclosed conditions.
        </Section>

        <Section title="Contact">
          Questions about these terms? Reach us at{" "}
          <a className="underline" href={`mailto:${business.email}`}>
            {business.email}
          </a>{" "}
          or{" "}
          <a className="underline" href={`tel:${business.phoneRaw}`}>
            {business.phone}
          </a>
          .
        </Section>
      </div>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className="text-xl font-semibold text-ink"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <p className="mt-2">{children}</p>
    </section>
  );
}
