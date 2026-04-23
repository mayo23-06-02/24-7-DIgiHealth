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

// --- Mock Data ---
const mockTimelineEvents: TimelineEvent[] = [
  {
    id: "1",
    type: "consultation",
    date: "2026-04-15T10:30:00",
    title: "General Consultation",
    description: "Seasonal allergies and persistent headache.",
    metadata: { doctor: "Dr. Nkosi", status: "Completed" },
  },
  {
    id: "2",
    type: "lab",
    date: "2026-04-10T14:00:00",
    title: "Full Blood Count",
    description: "Routine screening requested by GP.",
    metadata: { department: "Clinpath Laboratories" },
  },
  {
    id: "3",
    type: "ai_triage",
    date: "2026-04-05T20:15:00",
    title: "AI Symptom Triage",
    description: "Possible allergic rhinitis. Recommendations provided.",
  },
  {
    id: "4",
    type: "medication",
    date: "2026-03-28T11:00:00",
    title: "Amoxicillin Refill",
    description: "Antibiotic course for sinus infection.",
    metadata: { dosage: "500mg", duration: "7 days" },
  },
  {
    id: "5",
    type: "immunization",
    date: "2026-02-15T09:00:00",
    title: "Flu Vaccination",
    description: "Annual peak season immunization.",
    metadata: { doctor: "Nurse Sarah" },
  },
];

const mockVitals: VitalsDataPoint[] = [
  {
    date: "Mar 01",
    weight: 78,
    systolicBP: 120,
    diastolicBP: 80,
    heartRate: 72,
  },
  {
    date: "Mar 15",
    weight: 77.5,
    systolicBP: 118,
    diastolicBP: 78,
    heartRate: 70,
  },
  {
    date: "Apr 01",
    weight: 77,
    systolicBP: 122,
    diastolicBP: 82,
    heartRate: 74,
  },
  {
    date: "Apr 15",
    weight: 76.8,
    systolicBP: 119,
    diastolicBP: 79,
    heartRate: 71,
  },
];

const mockLabs: LabResult[] = [
  {
    id: "lab1",
    name: "Blood Count",
    date: "2026-04-10",
    orderedBy: "Dr. Nkosi",
    values: [
      {
        parameter: "Haemoglobin",
        value: "14.2",
        unit: "g/dL",
        referenceRange: "13.5–17.5",
        status: "normal",
      },
      {
        parameter: "WBC",
        value: "7.5",
        unit: "x10^9/L",
        referenceRange: "4.0–11.0",
        status: "normal",
      },
      {
        parameter: "Platelets",
        value: "250",
        unit: "x10^9/L",
        referenceRange: "150–450",
        status: "normal",
      },
    ],
  },
];

const mockMedications: Medication[] = [
  {
    id: "med1",
    name: "Amoxicillin",
    dosage: "500mg",
    instructions: "Take 3 times daily for 7 days",
    prescribedDate: "2026-03-28",
    refillsLeft: 0,
    status: "completed",
  },
  {
    id: "med2",
    name: "Cetirizine",
    dosage: "10mg",
    instructions: "Once daily before bed",
    prescribedDate: "2026-04-15",
    refillsLeft: 2,
    status: "active",
  },
];

const mockAllergies: Allergy[] = [
  {
    id: "all1",
    allergen: "Penicillin",
    severity: "severe",
    reaction: "Anaphylaxis, hives",
    source: "clinician",
  },
  {
    id: "all2",
    allergen: "Pollen",
    severity: "mild",
    reaction: "Sneezing, itchy eyes",
    source: "patient",
  },
];

const mockImmunizations: Immunization[] = [
  {
    id: "imm1",
    vaccine: "COVID-19 (Pfizer)",
    date: "2025-01-15",
    dose: "2 of 2",
    batch: "PF12345",
    administeredBy: "Mediclinic Cape Town",
    nextDue: "2026-01-15",
  },
];

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
  const [dashboardData, setDashboardData] = useState<any>(null);
  const { user } = useAuthContext();

  React.useEffect(() => {
    if (!user) return;
    fetch("/api/patient/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDashboardData(json.data);
      })
      .catch(console.error);
  }, [user]);

  const handleDownloadReport = async () => {
    if (!user) return;
    setIsDownloading(true);
    const toastId = toast.loading(
      "Verifying identity & generating secure report...",
    );

    try {
      // Endpoint handles either conversationId or userId/patientId seamlessly
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
      setIsMfaOpen(false); // close the MFA modal
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

  // Filter timeline
  const filteredEvents = useMemo(() => {
    return mockTimelineEvents.filter(
      (event) =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

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
            <div className="md:w-64">
              <Input
                type="text"
                placeholder="Search history..."
                icon={<Search size={20} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
      <Card className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-2  sticky top-0 z-30">
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
              className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all border-none ${
                activeTab === tab.id
                  ? ""
                  : "text-slate-500 bg-slate-100 cursor-pointer hover:border-primary/30 hover:text-primary"
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
            {/* Render Tab Content */}
            {activeTab === "timeline" && (
              <Card className="space-y-6 animate-dissolve">
                {filteredEvents.map((event, idx) => (
                  <div key={event.id} className="relative  group">
                    {/* Vertical Line */}
                    {idx !== filteredEvents.length - 1 && (
                      <div className="absolute left-7 top-10 bottom-0 w-[0.5px] bg-slate-200" />
                    )}

                    {/* Marker */}
                    <div className="absolute left-3 top-3  flex items-center gap-2 z-10 group-hover:border-primary/40 transition-colors">
                      <p className="text-primary w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center">
                        {getIcon(event.type)}
                      </p>
                      <div className="bg-slate-100 px-3 py-1 rounded-full  text-slate-500 ">
                        <p className="whitespace-nowrap font-bold text-xs  tracking-normal">
                          {event.type.replace("_", " ")}
                        </p>
                      </div>
                    </div>

                    {/* Content Card */}
                    <div className="bg-white border border-slate-200 rounded-lg pl-12 pr-6 pt-8 pb-6 hover:border-primary/20 transition-all">
                      <div className="flex justify-end  items-start mb-2">
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
                              <UserIcon size={14} className="text-primary" />
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
                ))}
              </Card>
            )}

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
                    <LineChart data={mockVitals}>
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
                        contentStyle={{ borderRadius: "8px", border: "none" }}
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

            {activeTab === "labs" && (
              <div className="space-y-6 animate-dissolve">
                {mockLabs.map((lab) => (
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
                            <span className="text-xs font-semibold text-slate-400  tracking-normal">
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
                ))}
              </div>
            )}

            {activeTab === "medications" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-dissolve">
                {mockMedications.map((med) => (
                  <div
                    key={med.id}
                    className="bg-white border border-slate-200 rounded-lg p-6 border-l-4 border-l-supportive-teal"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center text-supportive-teal">
                        <Pill size={24} />
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full  tracking-tighter ${
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
                ))}
              </div>
            )}

            {activeTab === "allergies" && (
              <div className="space-y-4 animate-dissolve">
                {mockAllergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                          allergy.severity === "severe"
                            ? "bg-rose-50 text-rose-500"
                            : "bg-amber-50 text-amber-500"
                        }`}
                      >
                        <FilterIcon size={28} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 group font-grotesk">
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
                            : "border-amber-100 bg-amber-50 text-amber-600"
                        }`}
                      >
                        {allergy.severity.to()}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        Source: {allergy.source}
                      </span>
                    </div>
                  </div>
                ))}
                <Button
                  variant="dashed"
                  className="w-full !py-4 rounded-lg text-slate-400 font-bold text-sm bg-transparent !min-w-0"
                >
                  + Report New Allergy
                </Button>
              </div>
            )}

            {activeTab === "immunizations" && (
              <Card className="overflow-x-auto custom-scrollbar animate-dissolve">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-xs font-bold  tracking-normal">
                      <th className="px-8 py-5">Vaccine</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5">Date</th>
                      <th className="px-8 py-5">Administered By</th>
                      <th className="px-8 py-5">Next Due</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {mockImmunizations.map((imm) => (
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
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Body Mapping (Fixed/Sticky) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-28 h-[calc(100vh-160px)] min-h-[600px] animate-in slide-in-from-right-10 duration-1000">
          <Card className="h-full w-full bg-white border border-slate-100 rounded-[3rem] overflow-hidden  shadow-primary/5 relative">
            <div className="absolute top-8 right-6 z-40">
              <div className="bg-primary/10 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 border border-primary/20">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-primary  ">
                  Live 3D Anatomy
                </span>
              </div>
            </div>

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

            {/* Context Tooltip */}
            <div className="absolute bottom-10 inset-x-10 z-40 pointer-events-none">
              <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-100 shadow-none">
                <p className="text-xs font-bold text-slate-400  tracking-normal mb-1">
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
                <span className="text-xs font-bold  tracking-normal">
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
                <span className="text-xs font-bold  tracking-normal">
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
              <label className="text-xs font-bold text-slate-400  tracking-normal">
                Additional Notes
              </label>
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
              isLoading={isSavingRefill}
            >
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* MFA Prompt Modal */}
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
    </div>
  );
}
