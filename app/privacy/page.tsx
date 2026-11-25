import type { Metadata } from "next";

import { PhoneLink } from "@/components/analytics/PhoneLink";
import { business, legal } from "@/lib/config/salonData";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <article className="container max-w-3xl py-16 md:py-20">
      <h1 className="text-4xl font-semibold text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Last updated: {legal.privacyUpdated}
      </p>

      <div className="mt-8 space-y-6 text-ink-soft leading-relaxed">
        <p>
          {legal.businessLegalName} (&ldquo;{business.name}&rdquo;) respects your
          privacy. This policy explains what information we collect and how we
          use it.
        </p>

        <Section title="Information We Collect">
          When you book an appointment, we collect your name, phone number, and
          email address. We use this information solely to schedule your
          appointments and to contact you about them. We never sell your phone
          number.
        </Section>

        <Section title="Website Measurement">
          We count visits, the pages you open, taps on our phone number and booking
          buttons, and how far you get in the booking steps. We also store whether
          you are on a phone, tablet, or computer, and the website that linked you
          here, such as Google or Instagram. A random id is stored in your browser
          for that count. It is not your name, we do not store the full link you
          came from, we do not sell it, and it is kept in our own database. Our
          host, Vercel, may also collect its own short-term usage statistics.
        </Section>

        <Section title="How We Use Your Information">
          Your information is used to manage your bookings, communicate with you,
          and improve our services. We do not sell or rent your personal
          information to third parties.
        </Section>

        <Section title="Data Retention & Security">
          We retain booking information only as long as necessary to provide our
          services and meet legal obligations. We take reasonable measures to
          protect your data.
        </Section>

        <Section title="Contact">
          For privacy questions, email us at{" "}
          <a className="underline" href={`mailto:${business.email}`}>
            {business.email}
          </a>
          , call{" "}
          <PhoneLink placement="privacy" className="underline">
            {business.phone}
          </PhoneLink>
          , or visit us at {business.address.line1}, {business.address.city},{" "}
          {business.address.state} {business.address.zip}.
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
