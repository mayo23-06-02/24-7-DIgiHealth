"use client";

import React from "react";
import { BiBuildings, BiFirstAid, BiMap } from "react-icons/bi";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { HospitalOverviewData } from "./types";

export default function FacilityBanner({
  facility,
  adminName,
}: {
  facility: NonNullable<HospitalOverviewData["facility"]>;
  adminName: string;
}) {
  const beds = facility.bedCapacity;
  return (
    <Card
      noPadding
      className="!rounded-lg overflow-hidden !border-0 bg-linear-to-br from-[#1a4d66] via-primary to-[#53CBF3] text-white shadow-lg shadow-primary/20"
    >
      <div className="p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            Facility overview · Welcome, {adminName}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold font-grotesk mt-1 flex items-center gap-2">
            <BiBuildings className="shrink-0 opacity-90" size={28} />
            <span className="truncate">{facility.name}</span>
          </h1>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <Badge
              label={facility.facilityType}
              status="neutral"
              className="!bg-white/15 !text-white border-0"
            />
            {(facility.city || facility.province) && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 text-sm font-bold font-grotesk">
                <BiMap size={14} />
                {[facility.city, facility.province].filter(Boolean).join(", ")}
              </span>
            )}
            <Badge
              label={facility.isOpen ? "Open" : "Closed"}
              status={facility.isOpen ? "success" : "error"}
              dot
              className={
                facility.isOpen
                  ? "!bg-emerald-500/30 !text-white border-0"
                  : "!bg-rose-500/30 !text-white border-0"
              }
            />
            {facility.emergencyServices && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 text-sm font-bold font-grotesk">
                <BiFirstAid size={14} /> Emergency
              </span>
            )}
          </div>
          {facility.specialties?.length > 0 && (
            <p className="text-xs text-white/75 mt-3 line-clamp-2">
              {facility.specialties.slice(0, 8).join(" · ")}
              {facility.specialties.length > 8
                ? ` +${facility.specialties.length - 8}`
                : ""}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto lg:min-w-[300px]">
          {[
            {
              label: "Beds",
              value: String(beds.total || "—"),
              sub: `${beds.occupancyPercent}% occ.`,
            },
            {
              label: "General free",
              value: String(beds.generalAvailable),
              sub: "available",
            },
            {
              label: "ICU free",
              value: String(beds.icuAvailable),
              sub: "available",
            },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-lg bg-white/15 backdrop-blur border border-white/20 px-3 py-2.5 text-center"
            >
              <p className="text-lg font-bold tabular-nums">{c.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                {c.label}
              </p>
              <p className="text-[10px] text-white/60 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
