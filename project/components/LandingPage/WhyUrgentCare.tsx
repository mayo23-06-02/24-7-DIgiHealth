"use client";

import React from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import {
  Wallet,
  Pill,
  Globe2,
  Star,
  ArrowRight,
} from "lucide-react";

const benefits = [
  {
    icon: Wallet,
    title: "Transparent, upfront pricing",
    description:
      "No surprise bills. Your plan covers the consultation — no hidden urgent-care facility fees on top.",
    bg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Pill,
    title: "Same-day prescriptions",
    description:
      "If medication is prescribed, it's sent straight to any partner pharmacy for same-day pickup.",
    bg: "bg-accent/15",
    iconColor: "text-ink-900",
  },
  {
    icon: Globe2,
    title: "24/7 care from anywhere",
    description:
      "Available country wide — book from your phone, tablet, or computer, wherever you are.",
    bg: "bg-success-50",
    iconColor: "text-success-700",
  },
  {
    icon: Star,
    title: "Top-rated, verified doctors",
    description:
      "Every practitioner is HPCSA-registered and rated by real patients after every consultation.",
    bg: "bg-secondary/15",
    iconColor: "text-secondary",
  },
];

export default function WhyUrgentCare() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
            Urgent Care, Online
          </span>
          <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk mb-4">
            Why book an urgent care visit with 24/7 DigiMedCare?
          </h2>
          <p className="text-ink-600 leading-relaxed">
            Skip the ER for everyday urgent concerns — see a verified doctor
            today, included in your plan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {benefits.map(({ icon: Icon, title, description, bg, iconColor }) => (
            <div key={title} className={`rounded-2xl p-6 ${bg}`}>
              <div className={`w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center mb-4 ${iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink-900 mb-1.5 font-grotesk">{title}</h3>
              <p className="text-sm text-ink-600 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/register">
            <Button variant="primary" icon={<ArrowRight size={16} />} iconPosition="right">
              Book Your Visit
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
