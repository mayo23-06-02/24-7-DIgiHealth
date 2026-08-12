"use client";
import React from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { PlayCircle, Users, HeartPulse, Clock, MapPin } from "lucide-react";

const badges = [
  { icon: Users, value: "50+", label: "Verified Specialists" },
  { icon: HeartPulse, value: "135K+", label: "Patients Cared For" },
  { icon: Clock, value: "24/7", label: "Always Available" },
  { icon: MapPin, value: "9", label: "Provinces Covered" },
];

export default function Hero() {
  return (
    <section id="home" className="bg-primary/[0.04] pt-32 md:pt-40 pb-0">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-end pb-16">
          <div className="reveal-hidden reveal-visible">
            <h1 className="text-4xl md:text-6xl font-medium text-ink-900 leading-[1.05] tracking-tight font-grotesk mb-6">
              Compassionate Care.
              <br />
              <span className="text-primary font-bold">Real Doctors, Anywhere.</span>
            </h1>
            <div className="flex gap-3">
              <Link href="/register">
                <Button variant="primary" size="lg">
                  Book Appointment
                </Button>
              </Link>
              <Link href="/#approach">
                <Button variant="outline" size="lg" icon={<PlayCircle size={18} />} iconPosition="left">
                  See How It Works
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-lg text-ink-600 leading-relaxed lg:text-right lg:justify-self-end lg:max-w-md">
            Skip the waiting room. Connect with verified South African doctors
            over secure video, chat, or AI-assisted triage — day or night,
            wherever you are.
          </p>
        </div>
      </div>

      {/* Full-width banner photo with floating stat badges */}
      <div className="relative w-full h-[45vh] md:h-[55vh] overflow-hidden">
        <img
          src="/LandingPage/bg-1.jpg"
          alt="24/7 DigiHealth care team"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/10 to-transparent" />
      </div>

      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
        <div className="relative -mt-12 md:-mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-16">
          {badges.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="bg-white rounded-lg border border-border shadow-lg p-4 md:p-6 flex flex-col gap-2"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon size={18} />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-ink-900 font-grotesk">{value}</p>
              <p className="text-xs md:text-sm text-ink-500 font-medium leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
