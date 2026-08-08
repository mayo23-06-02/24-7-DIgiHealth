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
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="space-y-4">
        
        <div className="flex items-center gap-5">
          <Avatar name={patient.fullName} size="xl" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-grotesk">
                {patient.fullName}
              </h1>
              <Badge
                label={patient.bloodType}
                status={patient.bloodType === "O+" ? "error" : "premium"}
                className="rounded-lg px-2 text-xs"
              />
            </div>
            <p className="text-slate-500 font-medium mt-1">
              {(patient.gender
                ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
                : "—")}{" "}
              · {patient.age ?? age} Years Old · Ref: #{patient.id.slice(-6)}
              {patient.dateJoined && (
                <>
                  {" "}
                  · Joined{" "}
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
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onStartChat} disabled={actionLoading}>
          <BiChat className="text-white" size={20} />
          {actionLoading ? "Loading..." : "Messenger"}
        </Button>

        <Button
          variant="outline"
          onClick={onDownloadReport}
          title="Download full clinical PDF report"
        >
          <BiDownload size={22} />
        </Button>

        <div className="relative" ref={menuRef}>
          <Button
            variant="outline"
            onClick={() => setMenuOpen((o) => !o)}
            title="More actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <BiDotsVerticalRounded size={24} />
          </Button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg  z-50 py-1 animate-in fade-in zoom-in-95 duration-150"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-3 px-4 p-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 text-left"
                onClick={() => {
                  setMenuOpen(false);
                  onBookAppointment();
                }}
              >
                <BiCalendarPlus className="text-primary" size={18} />
                Book appointment
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-3 px-4 p-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 text-left"
                onClick={() => {
                  setMenuOpen(false);
                  onDownloadReport();
                }}
              >
                <BiDownload className="text-primary" size={18} />
                Download full report
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-3 px-4 p-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 text-left"
                onClick={() => {
                  setMenuOpen(false);
                  onStartChat();
                }}
              >
                <BiChat className="text-primary" size={18} />
                Message patient
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-3 px-4 p-2 text-sm font-semibold text-red-600 hover:bg-red-50 text-left"
                onClick={() => {
                  setMenuOpen(false);
                  onRemove();
                }}
              >
                <BiTrash size={18} />
                Remove from practice
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
