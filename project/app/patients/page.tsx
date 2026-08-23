"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/LandingPage/SiteHeader";
import Footer from "@/components/LandingPage/Footer";
import Button from "@/components/ui/Button";
import {
  MessageSquareText,
  UserSearch,
  Video,
  ClipboardCheck,
  Users,
  FileText,
  Pill,
  Clock,
  Star,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    icon: MessageSquareText,
    title: "Tell us what's wrong",
    description:
      "Answer a few quick questions — or start with our AI triage if you're not sure what you need.",
  },
  {
    icon: UserSearch,
    title: "Get matched",
    description:
      "We show you available GPs or specialists based on your symptoms, not just whoever's free.",
  },
  {
    icon: Video,
    title: "See them today",
    description:
      "Video, chat, or voice — pick what suits you. Most patients are seen within the hour.",
  },
  {
    icon: ClipboardCheck,
    title: "Walk away with a plan",
    description:
      "E-prescriptions go straight to any partner pharmacy; your notes save automatically to your health record.",
  },
];

const features = [
  {
    icon: Users,
    title: "Family Plans",
    description: "Add a partner, parent, or child to your account and manage everyone's care from one login.",
  },
  {
    icon: FileText,
    title: "Digital Health Record",
    description: "Every consultation, prescription, and lab result — searchable, exportable, never lost between doctors.",
  },
  {
    icon: Pill,
    title: "E-Prescriptions",
    description: "Redeemable at any partner pharmacy, no paper, no second trip.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "3am fever or Sunday afternoon rash — a doctor is on the platform.",
  },
];

export default function PatientsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* Hero */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=1600&auto=format&fit=crop"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-ink-900/90 via-ink-900/70 to-ink-900/40" />
        <div className="relative container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="max-w-2xl">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-4">
              For Patients
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white leading-[1.1] tracking-tight font-grotesk mb-6">
              See a doctor today.
              <br />
              <span className="text-secondary font-bold">Not next Tuesday.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-xl mb-8">
              Skip the waiting room. Video or chat consultations with
              verified South African doctors, prescriptions sent straight to
              your pharmacy, and your full medical history in one place —
              day or night.
            </p>
            <Link href="/register">
              <Button variant="primary" size="lg" icon={<ArrowRight size={18} />} iconPosition="right">
                Book Your First Appointment
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
              Four steps, no queue
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ icon: Icon, title, description }, i) => (
              <div key={title} className="relative bg-surface-soft rounded-2xl p-6">
                <span className="text-xs font-bold text-primary/60 tracking-wide">
                  STEP {i + 1}
                </span>
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center my-4 text-primary shadow-xs">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-ink-900 mb-2 font-grotesk">{title}</h3>
                <p className="text-sm text-ink-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-16 md:py-24 bg-surface-soft">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
              What You Get
            </span>
            <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
              Everything your care needs, in one account
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
            <div className="relative h-64 sm:h-80 md:h-[440px] rounded-2xl overflow-hidden order-2 md:order-1">
              <Image
                src="https://images.unsplash.com/photo-1591604466107-ec97de577aff?q=80&w=900&auto=format&fit=crop"
                alt="Family checking a prescription on a phone at home"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 order-1 md:order-2">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="bg-white border border-border rounded-2xl p-5 flex gap-4">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
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
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 text-center">
            <div>
              <p className="text-3xl font-bold text-ink-900 font-grotesk tabular-nums">135K+</p>
              <p className="text-sm text-ink-400 mt-1">Patients cared for</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-border" />
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <span className="text-3xl font-bold text-ink-900 font-grotesk">4.9</span>
                <Star size={22} className="fill-accent text-accent" />
              </div>
              <p className="text-sm text-ink-400 mt-1">Average patient rating</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-border" />
            <div className="max-w-xs text-sm text-ink-600 leading-relaxed">
              Every doctor is registered with the HPCSA and identity-verified
              before they see a single patient.
              <Link href="/doctors" className="text-primary font-semibold ml-1 hover:underline">
                See how we vet doctors →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing clarity */}
      <section className="py-10 bg-surface-soft border-y border-border">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <p className="text-ink-600 font-medium">
            From <span className="text-primary font-bold">R250/month</span> ·
            Medical aid accepted · Cancel anytime ·{" "}
            <Link href="/pricing" className="text-primary font-semibold hover:underline">
              See all plans
            </Link>
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-16 md:py-24 bg-white text-center">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk mb-6">
            Your first consultation is a few minutes away.
          </h2>
          <Link href="/register">
            <Button variant="primary" size="lg" icon={<ArrowRight size={18} />} iconPosition="right">
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
