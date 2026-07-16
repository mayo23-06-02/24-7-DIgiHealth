"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BiPlusMedical, BiStar, BiChevronRight } from "react-icons/bi";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import type { HospitalOverviewData } from "./types";

export default function DoctorsOverview({
  doctors,
}: {
  doctors: HospitalOverviewData["doctors"];
}) {
  const router = useRouter();

  return (
    <Card noPadding className="!rounded-lg flex flex-col min-h-[360px] !p-0">
      <div className="px-5 py-4 border-b border-slate-100">
        <SectionHeader
          compact
          icon={<BiPlusMedical />}
          title="Doctors at this hospital"
          subtitle={`${doctors.length} on roster · duty status & patient load`}
          right={
            <Link href="/hospital_admin/staff">
              <Button
                variant="ghost"
                size="sm"
                className="!normal-case !tracking-normal !max-w-none"
                icon={<BiChevronRight size={16} />}
                iconPosition="right"
              >
                Manage
              </Button>
            </Link>
          }
        />
      </div>

      <div className="flex-1 overflow-auto max-h-[420px]">
        {doctors.length === 0 ? (
          <EmptyState
            title="No doctors linked yet"
            description='Add staff with role "doctor" to populate this view.'
            icon={<BiPlusMedical size={32} />}
            actionLabel="Add staff"
            onAction={() => router.push("/hospital_admin/staff")}
            className="py-10"
          />
        ) : (
          <ul className="divide-y divide-slate-50">
            {doctors.map((d) => (
              <li
                key={d.staffId}
                className="px-5 py-3.5 hover:bg-slate-50/80 transition-colors flex items-start gap-3"
              >
                <Avatar
                  name={d.name}
                  size="md"
                  status={d.isOnDuty ? "online" : "offline"}
                  className="!w-11 !h-11"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {d.name}
                    </p>
                    <Badge
                      label={d.isOnDuty ? "On duty" : "Off duty"}
                      status={d.isOnDuty ? "success" : "neutral"}
                      className="!text-[10px] !px-2 !py-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {d.specialisation || d.department}
                    {d.department && d.specialisation !== d.department
                      ? ` · ${d.department}`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] font-semibold text-slate-500">
                    <span>
                      Load:{" "}
                      <span className="text-slate-800">{d.patientLoad}</span>{" "}
                      appts
                    </span>
                    <span>
                      Today:{" "}
                      <span className="text-slate-800">
                        {d.appointmentsToday}
                      </span>
                    </span>
                    <span>
                      Done mo:{" "}
                      <span className="text-slate-800">
                        {d.completedMonth}
                      </span>
                    </span>
                    {d.rating > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-amber-600">
                        <BiStar size={12} /> {d.rating}
                        <span className="text-slate-400 font-medium">
                          ({d.reviewCount})
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/hospital_admin/staff/${d.staffId}`}
                  className="shrink-0 text-slate-300 hover:text-primary p-1"
                  title="View staff"
                >
                  <BiChevronRight size={18} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
