"use client";

import React from "react";
import Link from "next/link";
import PublicDoctorGrid from "@/components/doctor/PublicDoctorGrid";
import { ArrowRight } from "lucide-react";

export default function DoctorsSection() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
              Real Doctors
            </span>
            <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
              Meet a few of our verified doctors
            </h2>
          </div>
          <Link
            href="/doctors"
            className="text-primary font-semibold text-sm hover:underline flex items-center gap-1 shrink-0"
          >
            See how we vet every doctor <ArrowRight size={15} />
          </Link>
        </div>
        <PublicDoctorGrid limit={8} />
      </div>
    </section>
  );
}
