"use client";

import React from "react";
import Link from "next/link";
import { BiCalendar, BiChevronRight, BiTime } from "react-icons/bi";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import type { HospitalOverviewData } from "./types";

export default function UpcomingAppointments({
  items,
}: {
  items: HospitalOverviewData["upcomingAppointments"];
}) {
  return (
    <Card noPadding className="!rounded-lg !p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <SectionHeader
          compact
          icon={<BiCalendar />}
          title="Upcoming appointments"
          subtitle="Next clinic sessions"
          right={
            <Link href="/hospital_admin/appointments">
              <Button
                variant="ghost"
                size="sm"
                className="!normal-case !tracking-normal !max-w-none"
                icon={<BiChevronRight size={16} />}
                iconPosition="right"
              >
                All
              </Button>
            </Link>
          }
        />
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="No upcoming appointments"
          description="Scheduled sessions will show here."
          icon={<BiCalendar size={32} />}
          className="py-10"
        />
      ) : (
        <ul className="divide-y divide-slate-50 max-h-[320px] overflow-auto">
          {items.map((a) => (
            <li
              key={a.id}
              className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/80"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex flex-col items-center justify-center shrink-0 text-[10px] font-bold leading-tight">
                <span>
                  {new Date(a.scheduledStart).toLocaleDateString("en-ZA", {
                    day: "numeric",
                  })}
                </span>
                <span className="text-slate-400 uppercase">
                  {new Date(a.scheduledStart).toLocaleDateString("en-ZA", {
                    month: "short",
                  })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {a.patientName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {a.doctorName} · Room {a.room}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <Badge
                  label={a.type}
                  status="info"
                  className="!text-[10px] !px-2 !py-0.5 capitalize"
                />
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <BiTime size={12} />
                  {new Date(a.scheduledStart).toLocaleTimeString("en-ZA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
