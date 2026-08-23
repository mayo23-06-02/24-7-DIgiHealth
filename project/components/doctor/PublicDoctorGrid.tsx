"use client";

import React, { useEffect, useState } from "react";
import DoctorCard from "./DoctorCard";
import { Loader2 } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialisation: string;
  rating: number;
  reviewCount: number;
  languages: string[];
  isOnline: boolean;
  nextAvailable: string;
  avatar?: string;
  bio?: string;
}

/**
 * Public-facing doctor grid for marketing pages (Home, /doctors) — no
 * patient session required. Pulls real practitioners from the same
 * unauthenticated /api/hospital/doctors endpoint the in-app carousel uses,
 * but skips the patient-only bits (my-doctors linking, messaging, booking
 * modal) since an anonymous visitor can't do any of that yet. Cards route
 * straight to /register instead.
 */
export default function PublicDoctorGrid({ limit = 4 }: { limit?: number }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hospital/doctors")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDoctors(json.data.slice(0, limit));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (doctors.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {doctors.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} showPrice />
      ))}
    </div>
  );
}
