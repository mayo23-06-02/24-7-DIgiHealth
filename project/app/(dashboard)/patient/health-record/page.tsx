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
  LineChart as LineChartIcon,
  Clock,
  CheckCircle,
  Filter as FilterIcon,
  User as UserIcon,
} from "lucide-react";
import {
  BiPlus,
  BiLoaderAlt,
  BiMap,
  BiSolidTruck,
  BiStore,
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

import TimelineTab from "@/components/dashboard/patient/health-record/TimelineTab";
import MedicationsTab from "@/components/dashboard/patient/health-record/MedicationsTab";
import VitalsTab from "@/components/dashboard/patient/health-record/VitalsTab";
import LabsTab from "@/components/dashboard/patient/health-record/LabsTab";
import AllergiesTab from "@/components/dashboard/patient/health-record/AllergiesTab";
import ImmunizationsTab from "@/components/dashboard/patient/health-record/ImmunizationsTab";
import type {
  Allergy,
  HealthRecordTab,
  Immunization,
  LabResult,
  Medication,
  TimelineEvent,
  VitalsDataPoint,
} from "@/components/dashboard/patient/health-record/types";
import { formatHealthDate } from "@/components/dashboard/patient/health-record/types";

export default function HealthRecordPage() {
  const [activeTab, setActiveTab] = useState<HealthRecordTab>("timeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVital, setSelectedVital] = useState<
    "weight" | "bp" | "heartRate"
  >("weight");
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

  // Deep-link from notifications: /patient/health-record?tab=medications
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    const allowed = [
      "timeline",
      "body_map",
      "vitals",
      "labs",
      "medications",
      "allergies",
      "immunizations",
    ] as const;
    if (tab && (allowed as readonly string[]).includes(tab)) {
      setActiveTab(tab as (typeof allowed)[number]);
    }
  }, []);

  const fetchHealthRecord = React.useCallback(() => {
    return fetch("/api/patient/health-record")
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
      .catch(console.error);
  }, []);

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
    fetchHealthRecord().finally(() => setLoadingRecords(false));
  }, [user, fetchHealthRecord]);

  /** One-click health profile PDF — no MFA / verification */
  const handleDownloadReport = async () => {
    if (!user) return;
    setIsDownloading(true);
    const toastId = toast.loading("Generating health profile PDF…");

    try {
      const response = await fetch("/api/patient/health-record/report");
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }

      const blob = await response.blob();
      // Guard against JSON error returned with 200
      if (blob.type?.includes("application/json")) {
        throw new Error("Server returned an error instead of a PDF");
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "Health_Profile.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Health profile downloaded", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to download PDF report", {
        id: toastId,
      });
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

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* HEADER SECTION */}
      <PageHeader
        title="Medical Records"
        subtitle="POPIA-Compliant Health History"
        right={
          <div className="flex items-center gap-3">
            <Button
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="bg-primary text-white p-2.5 rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 px-5 text-sm font-semibold"
            >
              <Download size={20} />
              <span className="hidden sm:inline">
                {isDownloading ? "Generating…" : "Download PDF"}
              </span>
            </Button>
          </div>
        }
      />

      {/* Tabs Row */}
      <Card
        variant="glass"
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-2 sticky top-0 z-30"
      >
        <div className="flex p-1 gap-2 overflow-x-auto custom-scrollbar lg:no-scrollbar max-w-full">
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
                  <TimelineTab
                    events={filteredEvents}
                    onOpenMedsTab={() => setActiveTab("medications")}
                  />
                )}


                {/* VITALS TAB */}
                {activeTab === "vitals" && (
                  <VitalsTab
                    vitals={vitals}
                    selectedVital={selectedVital}
                    onSelectVital={setSelectedVital}
                    onVitalsUpdated={fetchHealthRecord}
                  />
                )}

                {/* LABS TAB */}
                {activeTab === "labs" && <LabsTab labs={labs} />}

                {/* MEDICATIONS TAB */}
                {activeTab === "medications" && (
                  <MedicationsTab
                    medications={medications}
                    onRequestRefill={(med) => {
                      setSelectedMedForRefill(med);
                      setIsRefillModalOpen(true);
                    }}
                  />
                )}


                {/* ALLERGIES TAB */}
                {activeTab === "allergies" && (
                  <AllergiesTab
                    allergies={allergies}
                    onAdd={() => setIsAllergyModalOpen(true)}
                    onRemove={handleDeleteAllergy}
                  />
                )}

                {/* IMMUNIZATIONS TAB */}
                {activeTab === "immunizations" && (
                  <ImmunizationsTab immunizations={immunizations} />
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
              <div className="bg-white/80 backdrop-blur-xl p-4 rounded-lg border border-slate-100 shadow-none">
                <p className="text-xs font-bold text-slate-500 tracking-normal mb-1">
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
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-primary shadow-none">
                <Pill size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {selectedMedForRefill?.name}
                </p>
                <p className="text-xs text-slate-500 font-medium">
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
                className={`p-4 h-auto rounded-lg border flex flex-col items-center gap-2 transition-all !min-w-0 ${
                  refillForm.deliveryMethod === "pickup"
                    ? ""
                    : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
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
                className={`p-4 h-auto rounded-lg border flex flex-col items-center gap-2 transition-all !min-w-0 ${
                  refillForm.deliveryMethod === "delivery"
                    ? ""
                    : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
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
              <h1 className="text-xs font-bold text-slate-500 tracking-normal">
                Additional Notes
              </h1>
              <textarea
                className="w-full h-24 p-4 rounded-lg border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white transition-all outline-none text-xs font-medium"
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
          <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 text-xs text-rose-700 leading-relaxed">
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
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
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
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
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
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
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
