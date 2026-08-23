"use client";

import React from "react";
import Link from "next/link";
import { HeartPulse, Stethoscope, ArrowRight } from "lucide-react";

export default function AudienceRouter() {
  return (
    <section className="bg-surface-soft py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
            Where do you fit in?
          </span>
          <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
            Two ways to work with us
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Link
            href="/patients"
            className="group bg-white border border-border rounded-2xl p-8 hover:shadow-lg hover:border-primary/40 transition-all duration-300 flex flex-col"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary">
              <HeartPulse size={26} />
            </div>
            <h3 className="text-xl font-bold text-ink-900 mb-2 font-grotesk">
              Looking for care?
            </h3>
            <p className="text-sm text-ink-600 leading-relaxed flex-1">
              See how booking a doctor, getting a prescription, and managing
              your family's health record actually works.
            </p>
            <span className="mt-6 text-primary font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              For Patients <ArrowRight size={16} />
            </span>
          </Link>

          <Link
            href="/doctors"
            className="group bg-white border border-border rounded-2xl p-8 hover:shadow-lg hover:border-primary/40 transition-all duration-300 flex flex-col"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary">
              <Stethoscope size={26} />
            </div>
            <h3 className="text-xl font-bold text-ink-900 mb-2 font-grotesk">
              A practitioner?
            </h3>
            <p className="text-sm text-ink-600 leading-relaxed flex-1">
              See how we vet, onboard, and support the doctors already on the
              platform.
            </p>
            <span className="mt-6 text-primary font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              For Doctors <ArrowRight size={16} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
