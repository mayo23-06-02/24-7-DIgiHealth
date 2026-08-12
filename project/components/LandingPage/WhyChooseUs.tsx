"use client";
import React from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

const shots = [
  "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=900&auto=format&fit=crop",
];

export default function WhyChooseUs() {
  return (
    <section id="why-choose-us" className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
        <div className="flex flex-col items-center gap-3 text-center mb-12">
          <span className="text-secondary font-bold tracking-normal text-sm">
            The Platform
          </span>
          <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk max-w-2xl">
            Built for Digital-First Care
          </h2>
          <p className="text-lg text-ink-600 max-w-2xl">
            Video consultations, AI triage, and your full medical history —
            all in one secure, POPIA-compliant platform.
          </p>
        </div>

        <div className="relative rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 h-[320px] md:h-[420px]">
            {shots.map((src, i) => (
              <img
                key={i}
                src={src}
                alt="24/7 DigiHealth in use"
                className={`w-full h-full object-cover ${i === 1 ? "sm:col-span-1" : ""}`}
              />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/90 via-ink-900/40 to-transparent pt-24 pb-8 px-6 md:px-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <p className="text-white text-sm md:text-base max-w-xl leading-relaxed">
              Every consultation, prescription, and lab result lives in one
              place — accessible to you and the practitioners you trust,
              nowhere else.
            </p>
            <Link href="/register" className="shrink-0">
              <Button variant="white">Explore the Platform</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
