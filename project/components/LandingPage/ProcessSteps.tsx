"use client";
import React from "react";
import Image from "next/image";
import { Clock, MapPin, CalendarCheck } from "lucide-react";

const steps = [
  { n: "01", title: "Sign Up & Verify", desc: "Create your account in under two minutes — no paperwork, no clinic visit." },
  { n: "02", title: "AI Symptom Check", desc: "Tell us how you're feeling and get an instant triage assessment." },
  { n: "03", title: "Book a Specialist", desc: "Choose from verified doctors available right now, in your language." },
  { n: "04", title: "Consult & Get Care", desc: "Video, chat, or voice — with prescriptions and follow-ups handled digitally." },
];

const infoCards = [
  { icon: Clock, title: "24/7 Availability", desc: "Mon–Sun · Always open, always staffed" },
  { icon: MapPin, title: "Nationwide, Virtually", desc: "All 9 provinces, one platform" },
  { icon: CalendarCheck, title: "Book in Minutes", desc: "Same-day appointments, most specialties" },
];

export default function ProcessSteps() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
        <div className="flex flex-col items-center gap-3 text-center mb-12">
          <span className="text-secondary font-bold tracking-normal text-sm">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
            Simple, Clear, Patient-Focused
          </h2>
        </div>

        <div className="relative rounded-lg overflow-hidden h-[380px] md:h-[180px] mb-8">
          <Image
            src="https://images.unsplash.com/photo-1622902046580-2b47f47f5471?q=80&w=1600&auto=format&fit=crop"
            alt="Patient on a video consultation"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-ink-900/40" />
          <div className="relative z-10 h-full grid grid-cols-2 md:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.n}
                className="border-l border-white/20 first:border-l-0 p-5 md:p-8 flex flex-col justify-end"
              >
                <span className="text-white/50 text-sm font-bold mb-2">{s.n}</span>
                <h3 className="text-white font-bold text-base md:text-lg mb-1 font-grotesk">
                  {s.title}
                </h3>
                <p className="text-white/80 text-xs md:text-sm ">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {infoCards.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-primary rounded-lg p-4 lg:p-6 flex items-center gap-4 text-white"
            >
              <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <p className="font-bold text-sm font-grotesk">{title}</p>
                <p className="text-white/70 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
