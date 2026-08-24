"use client";

import React from "react";
import Image from "next/image";
import { Video, Sparkles, Stethoscope, Pill, Users2 } from "lucide-react";

const services = [
  {
    label: "Virtual Consultations",
    icon: Video,
    image:
      "https://images.unsplash.com/photo-1584982751601-97dcc096659c?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Same-Day Consultations",
    icon: Sparkles,
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Specialist Referrals",
    icon: Stethoscope,
    image:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Prescriptions & Delivery",
    icon: Pill,
    image:
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Family Health Management",
    icon: Users2,
    // The previous photo id returned 404 from Unsplash, which is why this card
    // rendered as broken alt text.
    image:
      "https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=800&auto=format&fit=crop",
  },
];

export default function ServicesGallery() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-350 xl:max-w-350 2xl:max-w-350">
        <div className="flex flex-col items-center gap-3 text-center mb-12">
          <span className="text-secondary font-bold tracking-normal text-sm">
            What We Offer
          </span>
          <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
            Comprehensive Care for Every Need
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {services.map(({ label, icon: Icon, image }) => (
            <div
              key={label}
              className="group relative rounded-lg overflow-hidden aspect-[3/4] cursor-pointer"
            >
              <Image
                src={image}
                alt={label}
                fill
                sizes="(max-width: 768px) 50vw, 20vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Lightened from 85/20 — the overlay was dimming the whole
                  photo rather than just seating the caption. Enough contrast
                  remains at the base for white text to stay legible. */}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-ink-900/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center text-white">
                  <Icon size={16} />
                </div>
                <p className="text-white text-sm font-bold leading-tight font-grotesk">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
