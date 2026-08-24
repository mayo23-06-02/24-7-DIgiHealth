"use client";

import React from "react";
import Card from "@/components/ui/Card";
import Badge, { type BadgeStatus } from "@/components/ui/Badge";
import {
  BiCapsule,
  BiCheckShield,
  BiDroplet,
  BiEditAlt,
  BiError,
  BiPhone,
  BiPlus,
  BiPulse,
  BiRun,
  BiUser,
} from "react-icons/bi";
import type { PatientProfile } from "./types";
import { hasEmergencyContact, isPlaceholderValue } from "./emergencyContact";

interface PatientClinicalSidebarProps {
  patient: PatientProfile;
  onSyncRecords: () => void;
  onIssuePrescription: () => void;
}

const prescriptionStatusMap: Record<string, BadgeStatus> = {
  active: "success",
  completed: "neutral",
  discontinued: "error",
};

export default function PatientClinicalSidebar({
  patient,
  onSyncRecords,
  onIssuePrescription,
}: PatientClinicalSidebarProps) {
  return (
    <div className="lg:col-span-4 space-y-8">
      <div className="bg-primary px-4 py-6 rounded-lg border-none">
        <h3 className="text-slate-100 font-bold text-lg tracking-normal mb-4 font-grotesk">
          Vitals Summary
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <BiPulse size={16} />
              </div>
              <h1 className="font-bold text-white">Heart Rate</h1>
            </div>
            <p className="text-lg font-bold text-white">
              {patient.vitals?.heartRate || "---"}{" "}
              <span className="text-sm font-normal text-white/80">BPM</span>
            </p>
          </div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <BiCheckShield size={16} />
              </div>
              <h1 className="font-bold text-white">Risk Score</h1>
            </div>
            <p className="text-lg font-bold text-white tabular-nums">
              {patient.riskScore ?? 0}
              <span className="text-sm font-normal text-white/80"> / 100</span>
            </p>
          </div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <BiCheckShield size={16} />
              </div>
              <h1 className="font-bold text-white">Risk Status</h1>
            </div>
            <span className="px-2 py-1 rounded-lg bg-white/20 text-white text-xs font-bold">
              {patient.riskLabel || "—"}
            </span>
          </div>

          {/* Both are captured at registration. Until now neither reached this
              screen — blood type was written to a collection nothing read, and
              activity level was never stored at all. */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <BiDroplet size={16} />
              </div>
              <h1 className="font-bold text-white">Blood Type</h1>
            </div>
            <p className="text-lg font-bold text-white">
              {patient.bloodType && patient.bloodType !== "Unknown"
                ? patient.bloodType
                : "—"}
            </p>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <BiRun size={16} />
              </div>
              <h1 className="font-bold text-white">Activity</h1>
            </div>
            <p className="text-sm font-semibold text-white text-right leading-snug">
              {patient.activityLevel || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-slate-600 leading-none font-grotesk">
            Clinical Context
          </h3>
          <button
            type="button"
            onClick={onSyncRecords}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <BiEditAlt size={12} /> Update Records
          </button>
        </div>

        <Card className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-primary">
                <BiPulse size={18} />
              </div>
              <h4 className="font-bold text-slate-800 tracking-normal font-grotesk">
                Chronic Conditions
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {patient.medicalHistory.map((h) => (
                <span
                  key={h}
                  className="px-2 py-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 text-sm font-bold"
                >
                  {h}
                </span>
              ))}
              {patient.medicalHistory.length === 0 && (
                <p className="text-sm text-slate-500 italic ml-1">
                  No chronic history.
                </p>
              )}
            </div>
          </div>

          <div className="pt-5 border-t border-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <BiError size={14} />
              </div>
              <h4 className="font-bold text-slate-800 tracking-normal font-grotesk">
                Allergies
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {patient.allergies.map((a) => (
                <span
                  key={a}
                  className="px-2 py-2 rounded-lg bg-rose-50 text-rose-600 text-sm font-bold border border-rose-100"
                >
                  {a}
                </span>
              ))}
              {patient.allergies.length === 0 && (
                <Badge label="NO KNOWN ALLERGIES" status="success" size="sm" dot />
              )}
            </div>
          </div>

          <div className="pt-5 border-t border-slate-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center text-primary">
                  <BiCapsule size={14} />
                </div>
                <h4 className="font-bold text-slate-800 tracking-normal font-grotesk">
                  Active Prescriptions
                </h4>
              </div>
              <button
                type="button"
                onClick={onIssuePrescription}
                className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:scale-110 transition-all "
                title="Issue New Prescription"
              >
                <BiPlus size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {patient.prescriptions && patient.prescriptions.length > 0 ? (
                patient.prescriptions.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg bg-slate-50/50 border border-slate-100 group hover:border-primary/20 transition-all"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-sm font-bold text-slate-700">
                        {p.medicationName}
                      </h3>
                      <Badge
                        label={p.status}
                        status={prescriptionStatusMap[p.status] ?? "neutral"}
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-slate-500 font-medium mb-2">
                      {p.dosage}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100/50 gap-2">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                        Refills: {p.refillsRemaining}
                      </p>
                      {p.documentUrl || p.canDownload ? (
                        <a
                          href={p.documentUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold uppercase text-primary hover:underline"
                        >
                          Download script
                        </a>
                      ) : (
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                          {new Date(p.prescribedDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-lg">
                  <p className="text-sm text-slate-600">
                    No active prescriptions
                  </p>
                  <button
                    type="button"
                    onClick={onIssuePrescription}
                    className="text-sm text-primary hover:underline mt-2"
                  >
                    + Issue First Prescription
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-rose-50/30 border-rose-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center">
            <BiPhone size={18} />
          </div>
          <h4 className="text-xs font-bold text-rose-900 tracking-normal font-grotesk">
            Emergency Line
          </h4>
        </div>
        {patient.emergencyContact?.name ? (
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">
              {patient.emergencyContact.name}
            </p>
            <p className="text-xs font-bold text-slate-500 tracking-normal">
              {patient.emergencyContact.relationship}
            </p>
            <p className="text-base font-bold text-primary mt-2">
              {patient.emergencyContact.phone}
            </p>
          </div>
        ) : (
          <p className="text-xs font-medium text-slate-500">
            No emergency contact on file.
          </p>
        )}
      </Card>

      {(patient.ageRange || (patient.age && patient.age < 18)) &&
        hasEmergencyContact(patient.emergencyContact) && (
        <Card className="bg-blue-50/30 border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center">
              <BiUser size={18} />
            </div>
            <h4 className="text-xs font-bold text-blue-900 tracking-normal font-grotesk">
              Parent / Guardian
            </h4>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">
              {patient.emergencyContact.name}
            </p>
            {patient.emergencyContact.relationship && (
              <p className="text-xs font-bold text-slate-500 tracking-normal">
                {patient.emergencyContact.relationship}
              </p>
            )}
            {patient.emergencyContact.phone && (
              <p className="text-base font-bold text-primary mt-2">
                {patient.emergencyContact.phone}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
