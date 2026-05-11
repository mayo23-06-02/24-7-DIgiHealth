"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import RiskScoreCard from "@/components/dashboard/practitioner/RiskScoreCard";
import SoapNoteModal from "@/components/dashboard/practitioner/SoapNoteModal";
import {
  BiArrowBack,
  BiLoader,
  BiPulse,
  BiCalendar,
  BiPhone,
  BiUser,
  BiDroplet,
  BiCapsule,
  BiError,
  BiNote,
  BiVideo,
  BiChat,
  BiClinic,
  BiCheckShield,
  BiTime,
  BiPlus,
  BiDotsVerticalRounded,
  BiDownload,
  BiEditAlt,
  BiCloudUpload,
} from "react-icons/bi";
import Link from "next/link";
import MedicalManikin from "@/components/ui/MedicalManikin";
import { toast } from "react-hot-toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import VitalCardsGrid from "@/components/dashboard/practitioner/VitalCardsGrid";


interface PatientProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
  bloodType: string;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  emergencyContact: { name: string; phone: string; relationship: string };
  prescriptions: {
    id: string;
    medicationName: string;
    dosage: string;
    instructions: string;
    status: "active" | "completed" | "discontinued";
    prescribedDate: string;
    refillsRemaining: number;
  }[];
  pastConsultations: {
    id: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    status: string;
    type: string;
    chiefComplaint: string;
    riskScore: number;
    riskColor: "green" | "gray" | "red";
    soapNotes?: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
    };
  }[];
}

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [soapModal, setSoapModal] = useState({
    isOpen: false,
    consultationId: "",
    patientName: "",
  });
  const [expandedConsult, setExpandedConsult] = useState<string | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicationName: "",
    dosage: "",
    instructions: "",
    refillsRemaining: 0,
  });
  const [updateFormData, setUpdateFormData] = useState({
    medicalHistory: "",
    allergies: "",
    currentMedications: "",
  });
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [vitalsFormData, setVitalsFormData] = useState({
    heartRate: "",
    bloodPressure: "",
    bodyMass: "70",
    glucose: "0",
  });


  const handlePrescriptionSubmit = async () => {
    if (!patient || !prescriptionForm.medicationName) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/practitioner/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          ...prescriptionForm,
        }),
      });

      if (res.ok) {
        toast.success("Prescription issued successfully");
        setIsPrescriptionModalOpen(false);
        setPrescriptionForm({
          medicationName: "",
          dosage: "",
          instructions: "",
          refillsRemaining: 0,
        });
        // Refresh patient data
        const refreshRes = await fetch(`/api/practitioner/patients/${id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setPatient(refreshData.data);
      } else {
        toast.error("Failed to issue prescription");
      }
    } catch {
      toast.error("Network error");
    }
    setActionLoading(false);
  };

  useEffect(() => {
    const fetchPatient = async () => {
      if (!id || id === "mock") {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/practitioner/patients/${id}`);
        const data = await res.json();
        if (data.success) {
          setPatient(data.data);
        } else {
          toast.error(data.error || "Patient not found");
          setPatient(null);
        }
      } catch {
        toast.error("Failed to load patient health record");
        setPatient(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  useEffect(() => {
    if (patient) {
      setUpdateFormData({
        medicalHistory: patient.medicalHistory.join(", "),
        allergies: patient.allergies.join(", "),
        currentMedications: patient.currentMedications.join(", "),
      });
    }
  }, [patient]);

  const handleDownloadReport = async () => {
    if (!patient) return;
    toast.loading("Generating Clinical PDF Report...", { id: "pdf-gen" });

    // Simulate generation
    setTimeout(() => {
      toast.success("Clinical Report Generated: " + patient.fullName + ".pdf", {
        id: "pdf-gen",
      });
      // In a real app, we'd trigger a window.open or fetch to a PDF-server
    }, 2000);
  };

  const handleUpdateClinicalData = async () => {
    if (!patient) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/practitioner/patients/${id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicalHistory: updateFormData.medicalHistory
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          allergies: updateFormData.allergies
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          currentMedications: updateFormData.currentMedications
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        toast.success("Clinical records updated successfully");
        setIsUpdateModalOpen(false);
        // Refresh data
        const data = await res.json();
        setPatient((prev) => (prev ? { ...prev, ...data.data } : null));
      } else {
        toast.error("Failed to update records");
      }
    } catch {
      toast.error("Network error while updating");
    }
    setActionLoading(false);
  };

  const handleVitalsSubmit = async () => {
    setActionLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Vitals updated successfully");
    setIsVitalsModalOpen(false);
    setActionLoading(false);
  };


  const handleStartChat = async () => {
    if (!patient) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id }),
      });
      if (res.ok) {
        router.push("/practitioner/messages");
      }
    } catch {
      /* error handling */
    }
    setActionLoading(false);
  };

  const age = patient
    ? Math.floor(
        (Date.now() - new Date(patient.dateOfBirth).getTime()) /
          (365.25 * 86400000),
      )
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <BiLoader className="animate-spin text-primary" size={40} />
        <p className="text-sm font-bold text-slate-500  tracking-normal">
          Retrieving Health Record...
        </p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50 gap-6 p-8">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-500">
          <BiUser size={40} />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-800 font-grotesk">
            Record Not Found
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            The health record you're looking for might be unavailable or you
            might not have access.
          </p>
        </div>
        <Link
          href="/practitioner/patients"
          className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
        >
          Return to Patient List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Link
            href="/practitioner"
            className="inline-flex items-center gap-2 text-xs font-bold  tracking-normal text-slate-500 hover:text-primary transition-all group"
          >
            <BiArrowBack
              className="group-hover:-translate-x-1 transition-transform"
              size={14}
            />
            Back to Patients
          </Link>
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
                {patient.gender.charAt(0).toUpperCase() +
                  patient.gender.slice(1)}{" "}
                · {age} Years Old · Ref: #{patient.id.slice(-6)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleStartChat} disabled={actionLoading}>
            <BiChat className="text-white" size={20} />
            {actionLoading ? "Loading..." : "Messenger"}
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadReport}
            title="Download PDF Report"
          >
            <BiDownload size={22} />
          </Button>
          <Button variant="outline">
            <BiDotsVerticalRounded size={24} />
          </Button>
        </div>
      </div>

      <VitalCardsGrid onCardClick={() => setIsVitalsModalOpen(true)} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* 3D Body Mapping - Primary focus */}
          <Card className="p-0 overflow-hidden h-[600px] relative">
            <MedicalManikin
              gender={(patient.gender as any) || "female"}
              heightCm={170}
              weightKg={70}
              readOnly={true}
              patientId={patient.id}
            />
          </Card>

          {/* Consultation Records */}
          <Card noPadding>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-grotesk">
                  Clinical Timeline
                </h3>
                <p className="text-xs text-slate-500 font-bold  tracking-normal mt-0.5">
                  Historical Consultations & Outcomes
                </p>
              </div>
              <button className="text-primary hover:bg-primary/5 p-2 rounded-xl transition-all">
                <BiPlus size={24} />
              </button>
            </div>

            <div className="divide-y divide-slate-50">
              {patient.pastConsultations.length === 0 ? (
                <div className="py-20 text-center">
                  <BiClinic className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-sm font-bold text-slate-500">
                    No consultation history available.
                  </p>
                </div>
              ) : (
                patient.pastConsultations.map((c) => (
                  <div key={c.id} className="group">
                    <div
                      className="px-6 py-5 flex items-center gap-6 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() =>
                        setExpandedConsult(
                          expandedConsult === c.id ? null : c.id,
                        )
                      }
                    >
                      <div className="w-16 shrink-0 text-center">
                        <p className="text-xs font-bold text-slate-800">
                          {c.scheduledStartTime
                            ? new Date(c.scheduledStartTime).toLocaleDateString(
                                "en-ZA",
                                { day: "2-digit", month: "short" },
                              )
                            : "N/A"}
                        </p>
                        <p className="text-xs font-bold text-slate-500 ">
                          {c.scheduledStartTime
                            ? new Date(c.scheduledStartTime).getFullYear()
                            : ""}
                        </p>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm truncate font-grotesk">
                            {c.chiefComplaint || "No complaint recorded"}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-bold  tracking-tighter ${c.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-500 ">
                            <BiVideo className="text-primary" />
                            {c.type} Session
                          </div>
                          <div className="w-1 h-1 rounded-full bg-slate-200" />
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-500 ">
                            <BiTime />
                            30 Minutes
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-4">
                        <RiskScoreCard
                          score={c.riskScore}
                          color={c.riskColor}
                          size="sm"
                          showRing={false}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSoapModal({
                              isOpen: true,
                              consultationId: c.id,
                              patientName: patient.fullName,
                            });
                          }}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-500 hover:text-primary hover:border-primary/20 hover:shadow-none transition-all flex items-center justify-center"
                        >
                          <BiNote size={18} />
                        </button>
                      </div>
                    </div>

                    {expandedConsult === c.id && c.soapNotes && (
                      <div className="px-6 pb-6 bg-slate-50/50 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-none">
                          <p className="text-xs font-bold  text-primary tracking-normal mb-2">
                            Subjective
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {c.soapNotes.subjective || "No notes."}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-none">
                          <p className="text-xs font-bold  text-cyan-600 tracking-normal mb-2">
                            Objective
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {c.soapNotes.objective || "No notes."}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-none">
                          <p className="text-xs font-bold  text-purple-600 tracking-normal mb-2">
                            Assessment
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {c.soapNotes.assessment || "No notes."}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-none">
                          <p className="text-xs font-bold  text-emerald-600 tracking-normal mb-2">
                            Plan
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {c.soapNotes.plan || "No notes."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar info Area */}
        <div className="lg:col-span-4 space-y-8">
          {/* Summary Stats */}
          <div className="bg-primary px-4 py-6 rounded-lg border-none">
            <h3 className="text-slate-100 font-bold  text-lg tracking-normal mb-4 font-grotesk">
              Vitals Summary
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <BiDroplet size={16} />
                  </div>
                  <h1 className=" font-bold text-white">Blood Glucose</h1>
                </div>
                <p className="text-lg font-bold text-white">
                  5.8{" "}
                  <span className="text-sm font-normal text-white/80">
                    mmol/L
                  </span>
                </p>
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <BiPulse size={16} />
                  </div>
                  <h1 className=" font-bold text-white">Heart Rate</h1>
                </div>
                <p className="text-lg font-bold text-rose-800">
                  82{" "}
                  <span className="text-sm font-normal text-white/80">BPM</span>
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <BiCheckShield size={16} />
                  </div>
                  <h1 className=" font-bold text-white">Risk Status</h1>
                </div>
                <span className="px-2 py-1 rounded-lg bg-emerald-500 text-emerald-100 text-xs font-bold ">
                  Normal
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Background */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-bold text-slate-600 leading-none font-grotesk">
                Clinical Context
              </h3>
              <button
                onClick={() => setIsUpdateModalOpen(true)}
                className="flex items-center gap-1 text-sm text-primary hover:underline "
              >
                <BiEditAlt size={12} /> Sync Records
              </button>
            </div>

            <Card className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-primary">
                    <BiPulse size={18} />
                  </div>
                  <h4 className=" font-bold text-slate-800 tracking-normal font-grotesk">
                    Chronic Conditions
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {patient.medicalHistory.map((h) => (
                    <span
                      key={h}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm font-bold"
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
                  <h4 className=" font-bold text-slate-800 tracking-normal font-grotesk">
                    Allergies
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((a) => (
                    <span
                      key={a}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-sm font-bold border border-rose-100"
                    >
                      {a}
                    </span>
                  ))}
                  {patient.allergies.length === 0 && (
                    <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-100">
                      <BiCheckShield size={12} /> NO KNOWN ALLERGIES
                    </div>
                  )}
                </div>
              </div>

              {/* Prescriptions Section */}
              <div className="pt-5 border-t border-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center text-primary">
                      <BiCapsule size={14} />
                    </div>
                    <h4 className=" font-bold text-slate-800 tracking-normal font-grotesk">
                      Active Prescriptions
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsPrescriptionModalOpen(true)}
                    className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:scale-110 transition-all shadow-sm"
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
                        className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 group hover:border-primary/20 transition-all"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-sm font-bold text-slate-700">
                            {p.medicationName}
                          </h3>
                          <span
                            className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                              p.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 font-medium mb-2">
                          {p.dosage}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                            Refills: {p.refillsRemaining}
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                            {new Date(p.prescribedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-sm text-slate-600 ">
                        No active prescriptions
                      </p>
                      <button
                        onClick={() => setIsPrescriptionModalOpen(true)}
                        className="text-sm text-primary  hover:underline mt-2"
                      >
                        + Issue First Prescription
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Emergency Contact */}
          <Card className="bg-rose-50/30 border-rose-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center">
                <BiPhone size={18} />
              </div>
              <h4 className="text-xs font-bold text-rose-900  tracking-normal font-grotesk">
                Emergency Line
              </h4>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">
                {patient.emergencyContact.name}
              </p>
              <p className="text-xs font-bold text-slate-500  tracking-normal">
                {patient.emergencyContact.relationship}
              </p>
              <p className="text-base font-bold text-primary mt-2">
                {patient.emergencyContact.phone}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() =>
          setSoapModal({ isOpen: false, consultationId: "", patientName: "" })
        }
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />

      {/* Prescription Modal */}
      <Modal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        title="Issue New Prescription"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Input
              label="Medication Name"
              placeholder="e.g. Amoxicillin 500mg"
              value={prescriptionForm.medicationName}
              onChange={(e) =>
                setPrescriptionForm((prev) => ({
                  ...prev,
                  medicationName: e.target.value,
                }))
              }
              required
            />
            <Input
              label="Dosage"
              placeholder="e.g. One tablet twice daily"
              value={prescriptionForm.dosage}
              onChange={(e) =>
                setPrescriptionForm((prev) => ({
                  ...prev,
                  dosage: e.target.value,
                }))
              }
            />
            <div className="space-y-2">
              <h1 className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">
                Instructions
              </h1>
              <textarea
                className="w-full min-h-[100px] p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-primary/50 text-sm text-slate-700 font-medium transition-all"
                placeholder="Specific instructions for the patient..."
                value={prescriptionForm.instructions}
                onChange={(e) =>
                  setPrescriptionForm((prev) => ({
                    ...prev,
                    instructions: e.target.value,
                  }))
                }
              />
            </div>
            <Input
              label="Refills Remaining"
              type="number"
              placeholder="0"
              value={prescriptionForm.refillsRemaining}
              onChange={(e) =>
                setPrescriptionForm((prev) => ({
                  ...prev,
                  refillsRemaining: parseInt(e.target.value) || 0,
                }))
              }
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              onClick={handlePrescriptionSubmit}
              disabled={actionLoading || !prescriptionForm.medicationName}
            >
              {actionLoading ? "Issuing..." : "Confirm & Issue Prescription"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsPrescriptionModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Vitals Update Modal */}
      <Modal
        isOpen={isVitalsModalOpen}
        onClose={() => setIsVitalsModalOpen(false)}
        title="Update Patient Vitals"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Heart Rate (BPM)"
              placeholder="e.g. 72"
              value={vitalsFormData.heartRate}
              onChange={(e) =>
                setVitalsFormData((prev) => ({
                  ...prev,
                  heartRate: e.target.value,
                }))
              }
            />
            <Input
              label="Blood Pressure (mmHg)"
              placeholder="e.g. 120/80"
              value={vitalsFormData.bloodPressure}
              onChange={(e) =>
                setVitalsFormData((prev) => ({
                  ...prev,
                  bloodPressure: e.target.value,
                }))
              }
            />
            <Input
              label="Body Mass (kg)"
              placeholder="e.g. 70"
              value={vitalsFormData.bodyMass}
              onChange={(e) =>
                setVitalsFormData((prev) => ({
                  ...prev,
                  bodyMass: e.target.value,
                }))
              }
            />
            <Input
              label="Blood Glucose (mmol/L)"
              placeholder="e.g. 5.5"
              value={vitalsFormData.glucose}
              onChange={(e) =>
                setVitalsFormData((prev) => ({
                  ...prev,
                  glucose: e.target.value,
                }))
              }
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              onClick={handleVitalsSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? "Updating..." : "Save Vitals"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsVitalsModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>


      {/* Sync Records Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Sync Patient Records"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">
                Chronic Conditions (Comma separated)
              </h1>
              <textarea
                className="w-full min-h-[80px] p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-primary/50 text-sm text-slate-700 font-medium transition-all"
                value={updateFormData.medicalHistory}
                onChange={(e) =>
                  setUpdateFormData((prev) => ({
                    ...prev,
                    medicalHistory: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">
                Allergies (Comma separated)
              </h1>
              <textarea
                className="w-full min-h-[80px] p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-primary/50 text-sm text-slate-700 font-medium transition-all"
                value={updateFormData.allergies}
                onChange={(e) =>
                  setUpdateFormData((prev) => ({
                    ...prev,
                    allergies: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">
                Active Medications (Comma separated)
              </h1>
              <textarea
                className="w-full min-h-[80px] p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-primary/50 text-sm text-slate-700 font-medium transition-all"
                value={updateFormData.currentMedications}
                onChange={(e) =>
                  setUpdateFormData((prev) => ({
                    ...prev,
                    currentMedications: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              onClick={handleUpdateClinicalData}
              disabled={actionLoading}
            >
              {actionLoading ? "Updating..." : "Save Clinical Records"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsUpdateModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
