"use client";

import React from "react";
import Link from "next/link";
import SiteHeader from "@/components/LandingPage/SiteHeader";
import Footer from "@/components/LandingPage/Footer";

const LAST_UPDATED = "10 September 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-900 mb-3 font-grotesk">
        {title}
      </h2>
      <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
            Legal
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 font-grotesk">
            Terms and Conditions
          </h1>
          <p className="text-sm text-slate-400 mb-12">
            Last updated: {LAST_UPDATED}
          </p>

          <Section title="1. Agreement to these terms">
            <p>
              These Terms and Conditions ("Terms") govern your access to and
              use of the 24/7 DigiHealth platform, including our website,
              mobile applications, and telehealth services (together, the
              "Platform"), operated in South Africa. By creating an account
              or using the Platform, you agree to be bound by these Terms. If
              you do not agree, you may not use the Platform.
            </p>
          </Section>

          <Section title="2. Who can use the Platform">
            <p>
              You must be at least 18 years old to create an account, or be
              acting as the parent, guardian, or authorised representative of
              a minor or dependant registered on the Platform. Practitioners
              registering on the Platform confirm that they hold a valid,
              unrestricted registration with the Health Professions Council
              of South Africa (HPCSA) or other applicable regulatory body for
              the services they offer.
            </p>
          </Section>

          <Section title="3. Nature of the service">
            <p>
              24/7 DigiHealth is a technology platform that connects patients
              with independent, licensed healthcare practitioners for remote
              consultations. We do not practise medicine, and we are not a
              party to the clinical relationship between you and a
              practitioner. Practitioners are solely responsible for the
              medical advice, diagnoses, and treatment they provide.
            </p>
            <p>
              Telehealth is not appropriate for every condition. In a medical
              emergency, do not use the Platform — contact your local
              emergency services or go to the nearest emergency room
              immediately.
            </p>
          </Section>

          <Section title="4. Your account and information">
            <p>
              You agree to provide accurate, current, and complete
              information when registering and to keep it up to date. You
              are responsible for safeguarding your login credentials and for
              all activity under your account. Notify us immediately if you
              believe your account has been accessed without authorisation.
            </p>
          </Section>

          <Section title="5. Appointments, cancellations, and fees">
            <p>
              Consultation fees, subscription plans, and payment terms are
              presented to you at the time of booking or subscribing.
              Cancellation and rescheduling policies are shown within the
              booking flow and may vary by practitioner or facility. Fees
              already incurred for a completed consultation are non-
              refundable except as required by law.
            </p>
          </Section>

          <Section title="6. Privacy and your health information">
            <p>
              Our collection, use, and protection of your personal and health
              information is described in our Privacy Policy and Privacy
              Declaration, which forms part of these Terms and is provided to
              you during registration in accordance with the Protection of
              Personal Information Act (POPIA).
            </p>
          </Section>

          <Section title="7. Acceptable use">
            <p>
              You agree not to misuse the Platform, including by
              impersonating another person, submitting false medical
              information, attempting to access another user's account or
              data, or using the Platform for any unlawful purpose. We may
              suspend or terminate accounts that violate these Terms.
            </p>
          </Section>

          <Section title="8. Limitation of liability">
            <p>
              To the maximum extent permitted by law, 24/7 DigiHealth is not
              liable for any indirect, incidental, or consequential damages
              arising from your use of the Platform, or for the clinical
              judgement, actions, or omissions of any independent
              practitioner or facility using the Platform. Nothing in these
              Terms limits liability that cannot lawfully be excluded under
              South African law.
            </p>
          </Section>

          <Section title="9. Changes to these terms">
            <p>
              We may update these Terms from time to time. If we make
              material changes, we will notify you through the Platform or by
              email before the changes take effect. Continued use of the
              Platform after changes take effect constitutes acceptance of
              the updated Terms.
            </p>
          </Section>

          <Section title="10. Contact us">
            <p>
              If you have questions about these Terms, please contact us at{" "}
              <a
                href="mailto:support@24-7telehealth.co.za"
                className="text-primary underline decoration-2 underline-offset-4"
              >
                support@24-7telehealth.co.za
              </a>
              .
            </p>
          </Section>

          <div className="pt-6 border-t border-slate-100">
            <Link
              href="/register"
              className="text-sm font-semibold text-primary underline decoration-2 underline-offset-4"
            >
              &larr; Back to registration
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
