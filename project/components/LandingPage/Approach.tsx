"use client";
import React from "react";
import { CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";

const features = [
  {
    title: "Verified Medical Specialists",
    desc: "Every practitioner on 24/7 DigiHealth is HPCSA-registered and identity-verified before they can see a single patient.",
  },
  {
    title: "AI-Powered Symptom Triage",
    desc: "Describe how you're feeling and get an instant, structured assessment to help you and your doctor prioritize what matters.",
  },
  {
    title: "Family Account Management",
    desc: "Link your spouse, children, or parents to one account — manage bookings and billing for the whole household in one place.",
  },
  {
    title: "24/7 Virtual Access",
    desc: "No waiting rooms, no office hours. Book a consultation at 2am or 2pm — the choice is always yours.",
  },
];

export default function Approach() {
  return (
    <section id="approach" className="bg-surface-soft py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-12 items-center">
          <div className="reveal-hidden reveal-visible">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
              Our Approach
            </span>
            <h2 className="text-3xl md:text-4xl font-medium text-ink-900 mb-6 tracking-tight font-grotesk">
              The{" "}
              <span className="text-primary font-bold">
                24/7 DigiHealth Total Care™
              </span>{" "}
              Model
            </h2>
            <p className="text-lg text-ink-600 leading-relaxed mb-8">
              Providing patient-centered care through expert guidance,
              AI-assisted triage, and personalized support — every step of
              the way, from your first symptom to full recovery.
            </p>
            <Link href="/register">
              <Button variant="primary">Get Started</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-lg border border-border p-6 flex flex-col gap-3"
              >
                <CheckCircle2 size={22} className="text-success-500 shrink-0" />
                <h3 className="text-base font-bold text-ink-900 font-grotesk">
                  {f.title}
                </h3>
                <p className="text-sm text-ink-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
