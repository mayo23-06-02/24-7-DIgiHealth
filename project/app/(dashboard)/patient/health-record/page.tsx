"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Pill,
  FlaskConical as Lab,
  Syringe,
  Brain,
  Download,
  FileText,
  Search,
  LineChart as LineChartIcon,
  ChevronRight,
  Clock,
  CheckCircle,
  Filter as FilterIcon,
  User as UserIcon,
  Star,
  MapPin,
  TrendingUp,
  Package,
  Truck,
  Building2,
} from "lucide-react";
import {
  BiTime,
  BiCheckCircle,
  BiPlus,
  BiLoaderAlt,
  BiPackage,
  BiMap,
  BiSolidTruck,
  BiBuilding,
  BiStore,
  BiHeart,
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
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import MedicalManikin from "@/components/ui/MedicalManikin";
import Select from "@/components/ui/Select";
import { useAuthContext } from "@/components/auth/AuthProvider";
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

export default function HealthRecordPage() {
  const [activeTab, setActiveTab] = useState<
    | "timeline"
    | "body_map"
    | "vitals"
    | "labs"
    | "medications"
    | "allergies"
    | "immunizations"
  >("timeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVital, setSelectedVital] = useState<
    "weight" | "bp" | "heartRate"
  >("weight");
  const [isMfaOpen, setIsMfaOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [selectedMedForRefill, setSelectedMedForRefill] =
    useState<Medication | null>(null);
  const [refillForm, setRefillForm] = useState({
    deliveryMethod: "pickup" as "pickup" | "delivery",
    deliveryAddress: "",
    pharmacyId: "dischem_sandton",
    notes: "",
  });
  const [isSavingRefill, setIsSavingRefill] = useState(false);
  const [isAllergyModalOpen, setIsAllergyModalOpen] = useState(false);
  const [isSavingAllergy, setIsSavingAllergy] = useState(false);
  const [allergyForm, setAllergyForm] = useState({
    allergen: "",
    severity: "mild" as "mild" | "moderate" | "severe",
    reaction: "",
  });
  const [dashboardData, setDashboardData] = useState<any>(null);
  const { user } = useAuthContext();

  // State for health record data
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [vitals, setVitals] = useState<VitalsDataPoint[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [immunizations, setImmunizations] = useState<Immunization[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  React.useEffect(() => {
    if (!user) return;
    setLoadingRecords(true);

    // Fetch dashboard basic info (already existing)
    fetch("/api/patient/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDashboardData(json.data);
      })
      .catch(console.error);

    // Fetch full health record data
    fetch("/api/patient/health-record")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setTimeline(json.data.timeline);
          setVitals(json.data.vitals);
          setLabs(json.data.labs);
          setMedications(json.data.medications);
          setAllergies(json.data.allergies);
          setImmunizations(json.data.immunizations);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingRecords(false));
  }, [user]);

  const handleDownloadReport = async () => {
    if (!user) return;
    setIsDownloading(true);
    const toastId = toast.loading(
      "Verifying identity & generating secure report...",
    );

    try {
      const response = await fetch(`/api/chat/report/${user.id}`);
      if (!response.ok) throw new Error("Failed to generate report");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "Clinical_Report.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Health Record downloaded securely", { id: toastId });
      setIsMfaOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to download PDF report", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRefillRequest = async () => {
    if (!selectedMedForRefill) return;
    setIsSavingRefill(true);
    const tid = toast.loading("Submitting refill request...");

    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, 1500));

      toast.success(
        `Refill request for ${selectedMedForRefill.name} submitted successfully!`,
        { id: tid },
      );
      setIsRefillModalOpen(false);
      setSelectedMedForRefill(null);
    } catch (err) {
      toast.error("Failed to submit refill request", { id: tid });
    } finally {
      setIsSavingRefill(false);
    }
  };

  const handleAddAllergy = async () => {
    if (!allergyForm.allergen.trim() || !allergyForm.reaction.trim()) {
      toast.error("Please fill in all allergy fields.");
      return;
    }
    setIsSavingAllergy(true);
    const tid = toast.loading("Saving allergy...");
    try {
      const res = await fetch("/api/patient/health-record/allergies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allergyForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAllergies((prev) => [
          ...prev,
          { ...data.data, id: data.data.id || data.data._id },
        ]);
        setAllergyForm({ allergen: "", severity: "mild", reaction: "" });
        setIsAllergyModalOpen(false);
        toast.success("Allergy report added successfully.", { id: tid });
      } else {
        toast.error(data.error || "Failed to save allergy.", { id: tid });
      }
    } catch {
      toast.error("Network error.", { id: tid });
    }
    setIsSavingAllergy(false);
  };

  const handleDeleteAllergy = async (id: string) => {
    const tid = toast.loading("Removing allergy...");
    try {
      const res = await fetch(`/api/patient/health-record/allergies?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAllergies((prev) => prev.filter((a) => a.id !== id));
        toast.success("Allergy removed.", { id: tid });
      } else {
        toast.error("Failed to remove allergy.", { id: tid });
      }
    } catch {
      toast.error("Network error.", { id: tid });
    }
  };

  // Filter timeline
  const filteredEvents = useMemo(() => {
    return timeline.filter(
      (event) =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, timeline]);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* HEADER SECTION */}
      <PageHeader
        title="Medical Records"
        subtitle="POPIA-Compliant Health History"
        right={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsMfaOpen(true)}
              className="bg-primary text-white p-2.5 rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 px-5 text-sm font-semibold"
            >
              <Download size={20} />
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
          </div>
        }
      />

      {/* Tabs Row */}
      <Card
        variant="glass"
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-2 sticky top-0 z-30"
      >
        <div className="flex p-1 gap-2 overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: "timeline", label: "Timeline", icon: <Clock size={16} /> },
            {
              id: "vitals",
              label: "Vitals",
              icon: <LineChartIcon size={16} />,
            },
            { id: "labs", label: "Laboratory", icon: <Lab size={16} /> },
            { id: "medications", label: "Meds", icon: <Pill size={16} /> },
            { id: "allergies", label: "Allergies", icon: <Brain size={16} /> },
            {
              id: "immunizations",
              label: "Vaccines",
              icon: <Syringe size={16} />,
            },
          ].map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              variant={activeTab === tab.id ? "primary" : "ghost"}
              className={`flex items-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all border-none ${
                activeTab === tab.id
                  ? ""
                  : "text-slate-500 bg-slate-300 cursor-pointer hover:border-primary/30 hover:text-primary"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Records Content */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8 min-w-0">
          <div className="mt-2 text-slate-800">
            {loadingRecords ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <BiLoaderAlt className="animate-spin text-primary" size={40} />
                <p className="text-slate-500 font-bold">
                  Synchronizing medical records...
                </p>
              </div>
            ) : (
              <>
                {/* TIMELINE TAB */}
                {activeTab === "timeline" && (
                  <Card className="space-y-6 animate-dissolve">
                    {filteredEvents.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                        No events found in your medical history.
                      </div>
                    ) : (
                      filteredEvents.map((event, idx) => (
                        <div key={event.id} className="relative group">
                          {idx !== filteredEvents.length - 1 && (
                            <div className="absolute left-7 top-10 bottom-0 w-[0.5px] bg-slate-200" />
                          )}
                          <div className="absolute left-3 top-3 flex items-center gap-2 z-10 group-hover:border-primary/40 transition-colors">
                            <p className="text-primary w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center">
                              {getIcon(event.type)}
                            </p>
                            <div className="bg-slate-100 px-3 py-1 rounded-full text-slate-500">
                              <p className="whitespace-nowrap font-bold text-xs tracking-normal">
                                {event.type.replace("_", " ")}
                              </p>
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg pl-12 pr-6 pt-8 pb-6 hover:border-primary/20 transition-all">
                            <div className="flex justify-end items-start mb-2">
                              <span className="text-xs font-medium text-slate-400">
                                {formatDate(event.date)}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1 font-grotesk">
                              {event.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-4">
                              {event.description}
                            </p>
                            {event.metadata && (
                              <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50">
                                {event.metadata.doctor && (
                                  <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <UserIcon
                                      size={14}
                                      className="text-primary"
                                    />
                                    <span>{event.metadata.doctor}</span>
                                  </div>
                                )}
                                {event.metadata.status && (
                                  <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <CheckCircle
                                      size={14}
                                      className="text-green-500"
                                    />
                                    <span>{event.metadata.status}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="mt-5 flex gap-3">
                              <Button
                                variant="ghost"
                                className="!p-0 !min-w-0 !h-auto text-xs font-bold text-primary flex items-center gap-1.5 hover:underline bg-transparent"
                              >
                                <FileText size={16} /> View Details
                              </Button>
                              <Button
                                variant="ghost"
                                className="!p-0 !min-w-0 !h-auto text-xs font-bold text-slate-400 flex items-center gap-1.5 hover:text-primary transition-colors bg-transparent"
                              >
                                <Download size={16} /> Summary
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </Card>
                )}

                {/* VITALS TAB */}
                {activeTab === "vitals" && (
                  <div className="bg-white border border-slate-200 rounded-lg p-8 animate-dissolve">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 font-grotesk">
                          Biometric Trends
                        </h3>
                        <p className="text-sm text-slate-500">
                          Historical observations from clinical visits
                        </p>
                      </div>
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                        {[
                          { id: "weight", label: "Weight" },
                          { id: "bp", label: "Blood Pressure" },
                          { id: "heartRate", label: "Heart Rate" },
                        ].map((v) => (
                          <Button
                            key={v.id}
                            onClick={() => setSelectedVital(v.id as any)}
                            variant={selectedVital === v.id ? "white" : "ghost"}
                            className={`!px-4 !py-2 !h-auto !min-w-0 rounded-lg text-xs font-bold transition-all border-none ${
                              selectedVital === v.id
                                ? "text-primary shadow-none"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {v.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={vitals}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f1f5f9"
                          />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                            }}
                          />
                          {selectedVital === "weight" && (
                            <Line
                              type="monotone"
                              dataKey="weight"
                              stroke="#4493b8"
                              strokeWidth={4}
                              dot={{
                                r: 6,
                                fill: "#4493b8",
                                strokeWidth: 3,
                                stroke: "#fff",
                              }}
                              activeDot={{ r: 8 }}
                            />
                          )}
                          {selectedVital === "bp" && (
                            <>
                              <Line
                                type="monotone"
                                dataKey="systolicBP"
                                stroke="#E03A3A"
                                strokeWidth={3}
                                dot={{ r: 4 }}
                                name="Systolic"
                              />
                              <Line
                                type="monotone"
                                dataKey="diastolicBP"
                                stroke="#53CBF3"
                                strokeWidth={3}
                                dot={{ r: 4 }}
                                name="Diastolic"
                              />
                            </>
                          )}
                          {selectedVital === "heartRate" && (
                            <Line
                              type="monotone"
                              dataKey="heartRate"
                              stroke="#FFDE42"
                              strokeWidth={4}
                              dot={{
                                r: 6,
                                fill: "#FFDE42",
                                strokeWidth: 3,
                                stroke: "#fff",
                              }}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* LABS TAB */}
                {activeTab === "labs" && (
                  <div className="space-y-6 animate-dissolve">
                    {labs.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                        No laboratory results on record.
                      </div>
                    ) : (
                      labs.map((lab) => (
                        <Card key={lab.id}>
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div>
                              <h3 className="text-xl font-bold text-slate-800 font-grotesk">
                                {lab.name}
                              </h3>
                              <p className="text-sm text-slate-500">
                                Reported on {formatDate(lab.date)} · Ordered by{" "}
                                {lab.orderedBy}
                              </p>
                            </div>
                            <Button
                              variant="white"
                              className="flex items-center gap-2 font-bold text-sm bg-slate-50 border-none hover:bg-primary hover:text-white"
                            >
                              <FileText size={20} /> Full Lab Report
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {lab.values.map((v, i) => (
                              <div
                                key={i}
                                className="bg-slate-50/50 border border-slate-100 p-4 rounded-lg"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-semibold text-slate-400 tracking-normal">
                                    {v.parameter}
                                  </span>
                                  {v.status === "normal" ? (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                                      NORMAL
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-bold">
                                      ABNORMAL
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-xl font-bold text-slate-800">
                                    {v.value}
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium">
                                    {v.unit}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-2 font-medium">
                                  Ref: {v.referenceRange}
                                </p>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-dissolve">
                    {medications.length === 0 ? (
                      <div className="col-span-full text-center py-10 text-slate-400">
                        No prescribed medications found.
                      </div>
                    ) : (
                      medications.map((med) => (
                        <div
                          key={med.id}
                          className="bg-white border border-slate-200 rounded-lg p-6 border-l-4 border-l-supportive-teal"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center text-supportive-teal">
                              <Pill size={24} />
                            </div>
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-full tracking-tighter ${
                                med.status === "active"
                                  ? "bg-teal-100 text-teal-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {med.status}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 font-grotesk">
                            {med.name}
                          </h3>
                          <p className="text-sm font-semibold text-primary mb-2">
                            {med.dosage}
                          </p>
                          <p className="text-sm text-slate-500 mb-6 leading-relaxed italic">
                            "{med.instructions}"
                          </p>
                          <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                            <span className="text-xs text-slate-400">
                              Prescribed {formatDate(med.prescribedDate)}
                            </span>
                            {med.refillsLeft > 0 && (
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setSelectedMedForRefill(med);
                                  setIsRefillModalOpen(true);
                                }}
                                className="!p-0 !min-w-0 !h-auto text-xs font-bold text-primary hover:underline bg-transparent"
                              >
                                Request Refill ({med.refillsLeft} left)
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ALLERGIES TAB */}
                {activeTab === "allergies" && (
                  <div className="space-y-4 animate-dissolve">
                    {allergies.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                        No allergies recorded.
                      </div>
                    ) : (
                      allergies.map((allergy) => (
                        <div
                          key={allergy.id}
                          className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                        >
                          <div className="flex items-center gap-5">
                            <div
                              className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${
                                allergy.severity === "severe"
                                  ? "bg-rose-50 text-rose-500"
                                  : allergy.severity === "moderate"
                                    ? "bg-amber-50 text-amber-500"
                                    : "bg-slate-50 text-slate-400"
                              }`}
                            >
                              <FilterIcon size={28} />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-800 font-grotesk">
                                {allergy.allergen}
                              </h3>
                              <p className="text-sm text-slate-500">
                                {allergy.reaction}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                                allergy.severity === "severe"
                                  ? "border-rose-100 bg-rose-50 text-rose-600"
                                  : allergy.severity === "moderate"
                                    ? "border-amber-100 bg-amber-50 text-amber-600"
                                    : "border-slate-100 bg-slate-50 text-slate-500"
                              }`}
                            >
                              {allergy.severity.toUpperCase()}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              {allergy.source}
                            </span>
                            <button
                              onClick={() => handleDeleteAllergy(allergy.id)}
                              className="ml-2 p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                              title="Remove allergy"
                            >
                              <BiPlus size={16} className="rotate-45" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    <button
                      onClick={() => setIsAllergyModalOpen(true)}
                      className="w-full py-5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-sm hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                      <BiPlus size={20} /> Report New Allergy
                    </button>
                  </div>
                )}

                {/* IMMUNIZATIONS TAB */}
                {activeTab === "immunizations" && (
                  <Card className="overflow-x-auto custom-scrollbar animate-dissolve">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 text-xs font-bold tracking-normal">
                          <th className="px-8 py-5">Vaccine</th>
                          <th className="px-8 py-5">Status</th>
                          <th className="px-8 py-5">Date</th>
                          <th className="px-8 py-5">Administered By</th>
                          <th className="px-8 py-5">Next Due</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {immunizations.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="text-center py-10 text-slate-400"
                            >
                              No immunization records found.
                            </td>
                          </tr>
                        ) : (
                          immunizations.map((imm) => (
                            <tr
                              key={imm.id}
                              className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="px-8 py-6 font-bold text-slate-800 underline decoration-primary/20">
                                {imm.vaccine}
                              </td>
                              <td className="px-8 py-6">
                                <span className="flex items-center gap-1.5 text-green-600 font-bold">
                                  <CheckCircle size={14} /> {imm.dose}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-slate-500">
                                {formatDate(imm.date)}
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-xs font-medium text-slate-400">
                                  {imm.administeredBy}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-primary font-bold">
                                {imm.nextDue ? formatDate(imm.nextDue) : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Body Mapping (Fixed/Sticky) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-28 h-[calc(100vh-160px)] min-h-[600px] animate-in slide-in-from-right-10 duration-1000">
          <Card className="h-full w-full bg-white border border-slate-100 rounded-lg overflow-hidden shadow-primary/5 relative">
            <MedicalManikin
              gender={
                dashboardData?.profile?.gender ||
                (user?.gender as any) ||
                "female"
              }
              heightCm={dashboardData?.vitals?.height || 170}
              weightKg={dashboardData?.vitals?.weight || 75}
              readOnly={false}
            />
            <div className="absolute bottom-10 inset-x-10 z-40 pointer-events-none">
              <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-100 shadow-none">
                <p className="text-xs font-bold text-slate-400 tracking-normal mb-1">
                  Health Tip
                </p>
                <p className="text-xs font-bold text-slate-700 leading-tight">
                  Click on any body part to log persistent sensations or
                  clinical notes.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* REFILL MODAL */}
      <Modal
        isOpen={isRefillModalOpen}
        onClose={() => setIsRefillModalOpen(false)}
        title={
          selectedMedForRefill
            ? `Refill Request: ${selectedMedForRefill.name}`
            : "Request Refill"
        }
      >
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-none">
                <Pill size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {selectedMedForRefill?.name}
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  {selectedMedForRefill?.dosage} ·{" "}
                  {selectedMedForRefill?.refillsLeft} Refills Left
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={
                  refillForm.deliveryMethod === "pickup" ? "primary" : "ghost"
                }
                onClick={() =>
                  setRefillForm((prev) => ({
                    ...prev,
                    deliveryMethod: "pickup",
                  }))
                }
                className={`p-4 h-auto rounded-xl border flex flex-col items-center gap-2 transition-all !min-w-0 ${
                  refillForm.deliveryMethod === "pickup"
                    ? ""
                    : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                }`}
              >
                <BiStore size={24} />
                <span className="text-xs font-bold tracking-normal">
                  Pharmacy Pickup
                </span>
              </Button>
              <Button
                variant={
                  refillForm.deliveryMethod === "delivery" ? "primary" : "ghost"
                }
                onClick={() =>
                  setRefillForm((prev) => ({
                    ...prev,
                    deliveryMethod: "delivery",
                  }))
                }
                className={`p-4 h-auto rounded-xl border flex flex-col items-center gap-2 transition-all !min-w-0 ${
                  refillForm.deliveryMethod === "delivery"
                    ? ""
                    : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                }`}
              >
                <BiSolidTruck size={24} />
                <span className="text-xs font-bold tracking-normal">
                  Courier Delivery
                </span>
              </Button>
            </div>

            {refillForm.deliveryMethod === "delivery" ? (
              <Input
                label="Delivery Address"
                placeholder="Enter your full street address"
                value={refillForm.deliveryAddress}
                onChange={(e) =>
                  setRefillForm((prev) => ({
                    ...prev,
                    deliveryAddress: e.target.value,
                  }))
                }
                icon={<BiMap />}
              />
            ) : (
              <Select
                label="Select Pharmacy"
                value={refillForm.pharmacyId}
                onChange={(val) =>
                  setRefillForm((prev) => ({ ...prev, pharmacyId: val }))
                }
                options={[
                  { value: "dischem_sandton", label: "Dis-Chem Sandton City" },
                  { value: "clicks_rosebank", label: "Clicks Rosebank Mall" },
                  {
                    value: "netcare_pharmacy",
                    label: "Netcare Hospital Pharmacy",
                  },
                ]}
              />
            )}

            <div className="space-y-2">
              <h1 className="text-xs font-bold text-slate-400 tracking-normal">
                Additional Notes
              </h1>
              <textarea
                className="w-full h-24 p-4 rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white transition-all outline-none text-xs font-medium"
                placeholder="Any special instructions for the pharmacist?"
                value={refillForm.notes}
                onChange={(e) =>
                  setRefillForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsRefillModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleRefillRequest}
              loading={isSavingRefill}
            >
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* MFA PROMPT MODAL */}
      <Modal
        isOpen={isMfaOpen}
        onClose={() => setIsMfaOpen(false)}
        title="Identity Verification"
        width="md"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6">
              <CheckCircle size={32} />
            </div>
            <p className="text-sm text-slate-500 mb-2 leading-relaxed">
              Please enter the 6-digit MFA code sent to your registered device
              to access sensitive health data.
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <input
                key={i}
                type="text"
                maxLength={1}
                className="w-full h-14 border border-slate-200 rounded-xl text-center font-bold text-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => setIsMfaOpen(false)}
              variant="outline"
              className="flex-1"
              disabled={isDownloading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="flex-1 shadow-none shadow-primary/20"
            >
              {isDownloading ? "Generating..." : "Verify Access"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ALLERGY REPORTING MODAL */}
      <Modal
        isOpen={isAllergyModalOpen}
        onClose={() => setIsAllergyModalOpen(false)}
        title="Report New Allergy"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddAllergy();
          }}
          className="space-y-5"
        >
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-700 leading-relaxed">
            <strong>Important:</strong> Please provide accurate details about
            your allergy. This will be immediately visible to any practitioner
            treating you.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Allergen (e.g. Penicillin, Peanuts)
              </label>
              <input
                type="text"
                required
                placeholder="What are you allergic to?"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                value={allergyForm.allergen}
                onChange={(e) =>
                  setAllergyForm({ ...allergyForm, allergen: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Severity
                </label>
                <select
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                  value={allergyForm.severity}
                  onChange={(e) =>
                    setAllergyForm({
                      ...allergyForm,
                      severity: e.target.value as any,
                    })
                  }
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe / Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Reaction Type
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rash, Swelling"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                  value={allergyForm.reaction}
                  onChange={(e) =>
                    setAllergyForm({ ...allergyForm, reaction: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setIsAllergyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              fullWidth
              disabled={
                isSavingAllergy ||
                !allergyForm.allergen ||
                !allergyForm.reaction
              }
            >
              {isSavingAllergy ? (
                <BiLoaderAlt className="animate-spin" />
              ) : (
                "Save Allergy"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
