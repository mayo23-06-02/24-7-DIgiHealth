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
      className="rounded-lg bg-none overflow-hidden border-0   text-ink-800"
    >
      <div className="p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[11px]  uppercase tracking-wider text-primary">
            Facility overview · Welcome, {adminName}
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold font-grotesk mt-1 flex items-center gap-2">
            <BiBuildings className="shrink-0 opacity-90" size={28} />
            <span className="truncate">{facility.name}</span>
          </h1>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <Badge
              label={facility.facilityType}
              status="premium"
              className="border-0"
            />
            <Badge
              label={facility.isOpen ? "Open" : "Closed"}
              status={facility.isOpen ? "success" : "error"}
              className={
                facility.isOpen
                  ? "!bg-success-500 !text-white border-0"
                  : "!bg-danger-500 !text-white border-0"
              }
            />
            {(facility.city || facility.province) && (
              <span className="inline-flex items-center gap-1  px-3 py-1 rounded-full  text-sm font-semibold font-grotesk">
                <BiMap size={14} />
                <p>{[facility.city, facility.province].filter(Boolean).join(", ")}</p>
              </span>
            )}
            
            {facility.emergencyServices && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 text-sm font-semibold font-grotesk">
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

       
      </div>
    </Card>
  );
}
