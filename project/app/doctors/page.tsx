"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/LandingPage/SiteHeader";
import Footer from "@/components/LandingPage/Footer";
import Button from "@/components/ui/Button";
import PublicDoctorGrid from "@/components/doctor/PublicDoctorGrid";
import {
  BadgeCheck,
  FileCheck2,
  GraduationCap,
  Star,
  ArrowRight,
} from "lucide-react";

const vetting = [
  {
    icon: BadgeCheck,
    title: "HPCSA verification",
    description:
      "Registration number checked directly against the Health Professions Council register before onboarding.",
  },
  {
    icon: FileCheck2,
    title: "Identity & credential check",
    description:
      "Government ID, qualification, and specialty documentation reviewed by our clinical team.",
  },
  {
    icon: GraduationCap,
    title: "Platform onboarding",
    description:
      "Every practitioner is trained on our consultation tools, e-prescription workflow, and documentation standards before seeing patients.",
  },
  {
    icon: Star,
    title: "Ongoing review",
    description:
      "Patient ratings and outcomes are monitored continuously, not just checked once at signup.",
  },
];

const specialties = [
  "General Practice",
  "Paediatrics",
  "Cardiology",
  "Dermatology",
  "Mental Health",
  "Women's Health",
  "Endocrinology",
  "Physiotherapy",
];

export default function DoctorsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* Hero */}
      <section className="relative pt-10 pb-20 lg:pt-20 md:pb-28 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1600&auto=format&fit=crop"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-ink-900/90 via-ink-900/70 to-ink-900/40" />
        <div className="relative container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="max-w-3xl">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-4">
              For Doctors
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white leading-[1.1] tracking-tight font-grotesk mb-6">
              Every doctor here has been vetted twice — once by us, once by their record.
            </h1>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl">
              50+ verified specialists across South Africa, each one
              HPCSA-registered, identity-checked, and reviewed by real
              patients after every consultation.
            </p>
          </div>
        </div>
      </section>

      {/* Vetting process */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
              Our Vetting Process
            </span>
            <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
              How a doctor gets onto 24/7 DigiHealth
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {vetting.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-surface-soft rounded-2xl p-6 flex gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-white flex items-center justify-center text-primary shadow-xs">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-900 mb-1 font-grotesk">{title}</h3>
                  <p className="text-sm text-ink-600 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How consultations work */}
      <section className="py-16 md:py-24 bg-surface-soft">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="max-w-3xl">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
              How Consultations Work
            </span>
            <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk mb-5">
              What patients can expect from a consultation here
            </h2>
            <p className="text-ink-600 leading-relaxed text-lg">
              A structured intake before the call, a minimum consultation
              length, SOAP notes required after every session, e-prescriptions
              logged and traceable, and follow-up built into the platform
              rather than left to chance.
            </p>
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
              Specialties Covered
            </span>
            <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
              Care across the specialties that matter most
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {specialties.map((s) => (
              <span
                key={s}
                className="px-5 py-2.5 rounded-full border border-border text-sm font-medium text-ink-600 bg-surface-soft"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Meet a few doctors */}
      <section className="py-16 md:py-24 bg-surface-soft">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
              On The Platform
            </span>
            <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
              Meet a few of our doctors
            </h2>
          </div>
          <PublicDoctorGrid limit={8} />
          <div className="text-center mt-8">
            <Link href="/patients" className="text-primary font-semibold text-sm hover:underline">
              See how patients book a consultation →
            </Link>
          </div>
        </div>
      </section>

      {/* Practitioner note — deliberately no signup funnel */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="max-w-2xl mx-auto text-center bg-surface-soft rounded-2xl p-10">
            <h2 className="text-2xl md:text-3xl font-medium text-ink-900 tracking-tight font-grotesk mb-4">
              If you're a practitioner reading this
            </h2>
            <p className="text-ink-600 leading-relaxed mb-8">
              We grow our practitioner network directly, one conversation at
              a time. If you're HPCSA-registered and interested in joining,
              reach out and our clinical team will be in touch.
            </p>
            <Link href="/contact">
              <Button variant="primary" icon={<ArrowRight size={16} />} iconPosition="right">
                Contact Our Team
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
