"use client";
import React from "react";

const medicalAids = ["Discovery", "Bonitas", "Momentum", "Medishield", "Fedhealth", "Bestmed"];

export default function TrustStrip() {
  return (
    <section className="bg-accent py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-350 xl:max-w-350 2xl:max-w-350">
        <p className="text-center text-sm font-bold text-ink-500 tracking-normal mb-8">
          Consultations covered by your medical aid
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {medicalAids.map((name) => (
            <span
              key={name}
              className="px-6 py-3 bg-secondary rounded-lg text-ink-600 font-bold text-sm md:text-base font-grotesk"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
