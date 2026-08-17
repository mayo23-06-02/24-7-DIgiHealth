"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  BiArrowBack,
  BiCalendarPlus,
  BiChat,
  BiDotsVerticalRounded,
  BiDownload,
  BiTrash,
} from "react-icons/bi";
import type { PatientProfile } from "./types";
import Card from "@/components/ui/Card";

interface PatientProfileHeaderProps {
  patient: PatientProfile;
  age: number;
  actionLoading: boolean;
  onStartChat: () => void;
  onDownloadReport: () => void;
  onBookAppointment: () => void;
  onRemove: () => void;
}

export default function PatientProfileHeader({
  patient,
  age,
  actionLoading,
  onStartChat,
  onDownloadReport,
  onBookAppointment,
  onRemove,
}: PatientProfileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <Card variant="glass" className="flex relative flex-col md:flex-row md:items-end justify-between gap-4">
      <div className="space-y-4">

        <div className="flex items-center gap-5">
          <Avatar name={patient.fullName} size="xl" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-grotesk">
                {patient.fullName}
              </h1>

              {(patient.ageRange || (patient.age ?? age) < 18) && (
                <Badge
                  label="Child"
                  status="info"
                  className="rounded-lg px-2 text-xs"
                />
              )}
            </div>
            <div className="lg:flex lg:items-center lg:gap-2 text-slate-500 mt-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:hidden">
                <p className="bg-surface-soft px-3 py-1 rounded-full text-center"> {(patient.gender
                  ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
                  : "—")}{" "}</p>
                <p className="bg-surface-soft px-3 py-1 rounded-full text-center">  {patient.age ?? age} Years Old </p>
                <p className="bg-surface-soft px-3 py-1 rounded-full text-center">  Ref: #{patient.id.slice(-6)}</p>
                <p className="bg-surface-soft px-3 py-1 rounded-full text-center">
                  {patient.dateJoined && (
                    <>
                      {" "}
                      Joined:{" "}
                      {new Date(patient.dateJoined).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  )}
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <p className="bg-surface-soft px-3 py-1 rounded-full"> {(patient.gender
                  ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
                  : "—")}{" "}</p>
                <p className="bg-surface-soft px-3 py-1 rounded-full">  {patient.age ?? age} Years Old </p>
                <p className="bg-surface-soft px-3 py-1 rounded-full">  Ref: #{patient.id.slice(-6)}</p>
                <p className="bg-surface-soft px-3 py-1 rounded-full">
                  {patient.dateJoined && (
                    <>
                      {" "}
                      Joined:{" "}
                      {new Date(patient.dateJoined).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  )}
                </p>
              </div>
            </div>
            {patient.emergencyContact && (
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Guardian: {patient.emergencyContact.name}
                {patient.emergencyContact.relationship && (
                  <> ({patient.emergencyContact.relationship})</>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onStartChat} disabled={actionLoading}>
          {actionLoading ? "Loading..." : "Chat"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadReport}
          title="Download full clinical PDF report"
        >
          Save PDF Report
        </Button>

        
      </div>
    </Card>
  );
}
