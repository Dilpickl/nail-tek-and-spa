import type { Metadata } from "next";

import { business, legal } from "@/lib/config/salonData";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <article className="container max-w-3xl py-16 md:py-20">
      <h1 className="text-4xl font-semibold text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Last updated: {legal.lastUpdated}
      </p>

      <div className="mt-8 space-y-6 text-ink-soft leading-relaxed">
        <p>
          {legal.businessLegalName} (&ldquo;{business.name}&rdquo;) respects your
          privacy. This policy explains what information we collect and how we
          use it.
        </p>

        <Section title="Information We Collect">
          When you book an appointment, we collect your name, phone number, and
          email address. We use this information solely to schedule, confirm, and
          remind you about your appointments.
        </Section>

        <Section title="Text Messages">
          With your consent, we send automated transactional and booking reminder
          text messages. We never sell your phone number, and you may opt out at
          any time by replying STOP.
        </Section>

        <Section title="How We Use Your Information">
          Your information is used to manage your bookings, communicate with you,
          and improve our services. We do not sell or rent your personal
          information to third parties.
        </Section>

        <Section title="Data Retention &amp; Security">
          We retain booking information only as long as necessary to provide our
          services and meet legal obligations. We take reasonable measures to
          protect your data.
        </Section>

        <Section title="Contact">
          For privacy questions, contact us at{" "}
          <a className="underline" href={`mailto:${business.email}`}>
            {business.email}
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
