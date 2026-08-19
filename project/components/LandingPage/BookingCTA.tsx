"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function BookingCTA() {
  return (
    <section className="bg-surface-soft py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-350 xl:max-w-350 2xl:max-w-350">
        <div className="grid grid-cols-1 md:grid-cols-2 rounded-lg overflow-hidden">
          <div className="relative h-100 lg:h-180 md:h-auto">
            <Image
              src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1200&auto=format&fit=crop"
              alt="Doctor ready to help"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="bg-primary p-8 md:p-12 flex flex-col justify-center gap-6">
            <h2 className="text-xl md:text-4xl font-medium text-white tracking-tight font-grotesk leading-tight">
              Book Your Appointment Today
            </h2>
            <p className="text-white/85 leading-relaxed max-w-md">
              Create your account and see a doctor today — R250/month gets
              you 5 consultations,  and round-the-clock access.
              Family plans available too.
            </p>
            
            <Link href="/register" className="w-fit">
              <Button variant="white" >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
