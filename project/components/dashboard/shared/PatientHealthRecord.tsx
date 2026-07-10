"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Pill,
  FlaskConical as Lab,
  Syringe,
  Brain,
  Download,
  FileText,
  LineChart as LineChartIcon,
  Clock,
  CheckCircle,
  Filter as FilterIcon,
  User as UserIcon,
} from "lucide-react";
import {
  BiLoaderAlt,
  BiPlus,
} from "react-icons/bi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Button from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";

// --- Types ---
interface TimelineEvent {
  id: string;
  type: "consultation" | "medication" | "lab" | "immunization" | "ai_triage";
  date: string;
  title: string;
  description: string;
  metadata?: {
    doctor?: string;
    department?: string;
    dosage?: string;
    duration?: string;
    status?: string;
  };
}

interface VitalsDataPoint {
  date: string;
  weight?: number;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
}

interface LabResult {
  id: string;
  name: string;
  date: string;
  orderedBy: string;
  values: {
    parameter: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: "normal" | "high" | "low";
  }[];
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  prescribedDate: string;
  refillsLeft: number;
  status: "active" | "completed" | "discontinued";
  documentUrl?: string | null;
  documentName?: string | null;
  canDownload?: boolean;
}

interface Allergy {
  id: string;
  allergen: string;
  severity: "mild" | "moderate" | "severe";
  reaction: string;
  source: "patient" | "clinician";
}

interface Immunization {
  id: string;
  vaccine: string;
  date: string;
  dose: string;
  batch: string;
  administeredBy: string;
  nextDue?: string;
}

interface PatientHealthRecordProps {
  patientId: string;
  isPractitioner?: boolean;
}

export default function PatientHealthRecord({ patientId, isPractitioner = false }: PatientHealthRecordProps) {
  const [activeTab, setActiveTab] = useState<
    | "timeline"
    | "vitals"
    | "labs"
    | "medications"
    | "allergies"
    | "immunizations"
  >("timeline");
  const [selectedVital, setSelectedVital] = useState<"weight" | "bp" | "heartRate">("weight");
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [vitals, setVitals] = useState<VitalsDataPoint[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [immunizations, setImmunizations] = useState<Immunization[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoadingRecords(true);

    const apiUrl = isPractitioner 
      ? `/api/practitioner/patients/${patientId}/health-record`
      : `/api/patient/health-record`;

    fetch(apiUrl)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setTimeline(json.data.timeline);
          setVitals(json.data.vitals);
          setLabs(json.data.labs);
          setMedications(json.data.medications);
          setAllergies(json.data.allergies);
          setImmunizations(json.data.immunizations);
        } else {
          toast.error(json.error || "Failed to load health records");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Network error while loading health records");
      })
      .finally(() => setLoadingRecords(false));
  }, [patientId, isPractitioner]);

  const getIcon = (type: string) => {
    switch (type) {
      case "consultation":
        return <Calendar className="text-primary" size={24} />;
      case "medication":
        return <Pill className="text-primary" size={24} />;
      case "lab":
        return <Lab className="text-primary" size={24} />;
      case "immunization":
        return <Syringe className="text-primary" size={24} />;
      case "ai_triage":
        return <Brain className="text-primary" size={24} />;
      default:
        return <FileText size={24} />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loadingRecords) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <BiLoaderAlt className="animate-spin text-primary" size={40} />
        <p className="text-slate-500 font-bold">Synchronizing medical records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs Row */}
      <div className="flex p-1 gap-2 overflow-x-auto custom-scrollbar no-scrollbar bg-slate-50 rounded-xl">
        {[
          { id: "timeline", label: "Timeline", icon: <Clock size={16} /> },
          { id: "vitals", label: "Vitals", icon: <LineChartIcon size={16} /> },
          { id: "labs", label: "Laboratory", icon: <Lab size={16} /> },
          { id: "medications", label: "Meds", icon: <Pill size={16} /> },
          { id: "allergies", label: "Allergies", icon: <Brain size={16} /> },
          { id: "immunizations", label: "Vaccines", icon: <Syringe size={16} /> },
        ].map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            variant={activeTab === tab.id ? "primary" : "ghost"}
            className={`flex items-center gap-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border-none py-2 px-4 ${
              activeTab === tab.id
                ? ""
                : "text-slate-500 hover:text-primary hover:bg-white"
            }`}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mt-4">
        {/* TIMELINE TAB */}
        {activeTab === "timeline" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {timeline.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No events found in medical history.</div>
            ) : (
              timeline.map((event, idx) => (
                <div key={event.id} className="relative group">
                  {idx !== timeline.length - 1 && (
                    <div className="absolute left-7 top-10 bottom-0 w-[0.5px] bg-slate-200" />
                  )}
                  <div className="absolute left-3 top-3 flex items-center gap-2 z-10">
                    <p className="text-primary w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center">
                      {getIcon(event.type)}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg pl-14 pr-6 pt-6 pb-6 hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="bg-slate-100 px-3 py-1 rounded-full text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        {event.type.replace("_", " ")}
                      </div>
                      <span className="text-xs font-medium text-slate-500">{formatDate(event.date)}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-1 font-grotesk">{event.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-4">{event.description}</p>
                    {event.metadata && (
                      <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50">
                        {event.metadata.doctor && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <UserIcon size={14} className="text-primary" />
                            <span>{event.metadata.doctor}</span>
                          </div>
                        )}
                        {event.metadata.status && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <CheckCircle size={14} className="text-green-500" />
                            <span>{event.metadata.status}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* VITALS TAB */}
        {activeTab === "vitals" && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-grotesk">Biometric Trends</h3>
                <p className="text-xs text-slate-500">Historical observations from clinical visits</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {[
                  { id: "weight", label: "Weight" },
                  { id: "bp", label: "BP" },
                  { id: "heartRate", label: "Pulse" },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVital(v.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedVital === v.id
                        ? "bg-white text-primary shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitals}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  {selectedVital === "weight" && (
                    <Line type="monotone" dataKey="weight" stroke="#4493b8" strokeWidth={3} dot={{ r: 4, fill: "#4493b8" }} activeDot={{ r: 6 }} />
                  )}
                  {selectedVital === "bp" && (
                    <>
                      <Line type="monotone" dataKey="systolicBP" stroke="#E03A3A" strokeWidth={2} dot={{ r: 3 }} name="Systolic" />
                      <Line type="monotone" dataKey="diastolicBP" stroke="#53CBF3" strokeWidth={2} dot={{ r: 3 }} name="Diastolic" />
                    </>
                  )}
                  {selectedVital === "heartRate" && (
                    <Line type="monotone" dataKey="heartRate" stroke="#FFDE42" strokeWidth={3} dot={{ r: 4, fill: "#FFDE42" }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* LABS TAB */}
        {activeTab === "labs" && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {labs.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No laboratory results on record.</div>
            ) : (
              labs.map((lab) => (
                <Card key={lab.id} className="p-5">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 font-grotesk">{lab.name}</h3>
                      <p className="text-xs text-slate-500">Reported {formatDate(lab.date)} · {lab.orderedBy}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {lab.values.map((v, i) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{v.parameter}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${v.status === "normal" ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"}`}>
                            {v.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-slate-800">{v.value}</span>
                          <span className="text-xs text-slate-500">{v.unit}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Ref: {v.referenceRange}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* MEDICATIONS TAB */}
        {activeTab === "medications" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-500">
            {medications.length === 0 ? (
              <div className="col-span-full text-center py-10 text-slate-500">No prescribed medications found.</div>
            ) : (
              medications.map((med) => (
                <div key={med.id} className="bg-white border border-slate-200 rounded-xl p-5 border-l-4 border-l-primary">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-primary">
                      <Pill size={20} />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${med.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {med.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 font-grotesk">{med.name}</h3>
                  <p className="text-xs font-semibold text-primary mb-2">{med.dosage}</p>
                  <p className="text-xs text-slate-500 leading-relaxed italic">"{med.instructions}"</p>
                  <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{formatDate(med.prescribedDate)}</span>
                    {(med.canDownload || med.documentUrl) && med.documentUrl ? (
                      <a
                        href={med.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={med.documentName || undefined}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                      >
                        <Download size={12} /> Pharmacy script
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        No script file
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ALLERGIES TAB */}
        {activeTab === "allergies" && (
          <div className="space-y-3 animate-in fade-in duration-500">
            {allergies.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No allergies recorded.</div>
            ) : (
              allergies.map((allergy) => (
                <div key={allergy.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${allergy.severity === "severe" ? "bg-rose-50 text-rose-500" : "bg-slate-50 text-slate-500"}`}>
                      <FilterIcon size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 font-grotesk">{allergy.allergen}</h3>
                      <p className="text-xs text-slate-500">{allergy.reaction}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${allergy.severity === "severe" ? "border-rose-100 bg-rose-50 text-rose-600" : "border-slate-100 bg-slate-50 text-slate-500"}`}>
                    {allergy.severity.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* IMMUNIZATIONS TAB */}
        {activeTab === "immunizations" && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {immunizations.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No immunizations recorded.</div>
            ) : (
              immunizations.map((imm) => (
                <div key={imm.id} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                      <Syringe size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 font-grotesk">{imm.vaccine}</h3>
                      <p className="text-xs text-slate-500">{imm.administeredBy} · {formatDate(imm.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dose: {imm.dose}</p>
                    {imm.nextDue && <p className="text-[10px] font-bold text-primary mt-0.5">Next Due: {formatDate(imm.nextDue)}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
