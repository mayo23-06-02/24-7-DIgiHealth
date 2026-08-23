"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";

const specialists = [
  {
    name: "Dr. Zinhle Ndlovu",
    role: "General Practitioner",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=400&auto=format&fit=crop",
  },
  {
    name: "Dr. Mthokozisi Luthuli",
    role: "Cardiologist",
    image: "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?q=80&w=400&auto=format&fit=crop",
  },
  {
    name: "Dr. Nokuthula Pretorius",
    role: "Endocrinologist",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400&auto=format&fit=crop",
  },
  {
    name: "Dr. Sakhile Zulu",
    role: "Obstetrician",
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=400&auto=format&fit=crop",
  },
];

export default function TeamGrid() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-350 xl:max-w-350 2xl:max-w-350">
        <div className="flex flex-col items-center gap-3 text-center mb-12">
          <span className="text-secondary font-bold tracking-normal text-sm">
            Our Specialists
          </span>
          <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
            Experts Dedicated to Your Health
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
          {specialists.map((s) => (
            <div key={s.name} className="text-center">
              <div className="relative rounded-lg overflow-hidden aspect-square mb-4">
                <Image
                  src={s.image}
                  alt={s.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <p className="font-bold text-ink-900 text-sm md:text-base font-grotesk">{s.name}</p>
              <p className="text-ink-400 text-xs md:text-sm mt-0.5">{s.role}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Link href="/register">
            <Button variant="outline">Join Our Family of Healthy Patients</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
