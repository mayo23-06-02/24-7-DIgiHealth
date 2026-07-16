"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import SoapNoteModal from "@/components/dashboard/practitioner/SoapNoteModal";
import MedicalManikin from "@/components/ui/MedicalManikin";
import VitalCardsGrid from "@/components/dashboard/practitioner/VitalCardsGrid";
import PatientHealthRecord from "@/components/dashboard/shared/PatientHealthRecord";
import BookingModal from "@/components/doctor/BookingModal";
import { toast } from "react-hot-toast";
import { BiLoader, BiUser } from "react-icons/bi";
import {
  ClinicalTimeline,
  PatientClinicalSidebar,
  PatientProfileHeader,
  PatientProfileModals,
  PatientDocumentsPanel,
  type PatientProfile,
  type PrescriptionFormState,
  type VitalsFormState,
  type ClinicalUpdateFormState,
} from "@/components/dashboard/practitioner/patient-profile";

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
  const [prescriptionForm, setPrescriptionForm] =
    useState<PrescriptionFormState>({
      medicationName: "",
      dosage: "",
      instructions: "",
      refillsRemaining: 0,
    });
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [updateFormData, setUpdateFormData] = useState<ClinicalUpdateFormState>(
    {
      medicalHistory: "",
      allergies: "",
      currentMedications: "",
    },
  );
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [vitalsFormData, setVitalsFormData] = useState<VitalsFormState>({
    heartRate: "",
    bloodPressure: "",
    bodyMass: "70",
    glucose: "0",
  });
  const [showBooking, setShowBooking] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!id || id === "mock") {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/practitioner/patients/${id}`);
        const data = await res.json();
        if (data.success) setPatient(data.data);
        else {
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
    if (!patient) return;
    setUpdateFormData({
      medicalHistory: patient.medicalHistory.join(", "),
      allergies: patient.allergies.join(", "),
      currentMedications: patient.currentMedications.join(", "),
    });
    if (patient.vitals) {
      setVitalsFormData({
        heartRate: patient.vitals.heartRate?.toString() || "",
        bloodPressure: patient.vitals.bloodPressure || "",
        bodyMass: patient.vitals.weight?.toString() || "",
        glucose: "",
      });
    }
  }, [patient]);

  const handleDownloadReport = async () => {
    if (!patient) return;
    toast.loading("Generating health profile PDF…", { id: "pdf-gen" });
    try {
      const res = await fetch(
        `/api/practitioner/patients/${patient.id}/report`,
        { method: "GET" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Report generation failed");
      }
      const blob = await res.blob();
      if (blob.type?.includes("application/json")) {
        throw new Error("Server returned an error instead of a PDF");
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^"]+)"?/);
      a.href = url;
      a.download =
        match?.[1] ||
        `${patient.fullName.replace(/\s+/g, "_")}_Health_Profile.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Health profile downloaded", { id: "pdf-gen" });
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Failed to download report",
        { id: "pdf-gen" },
      );
    }
  };

  const handleRemovePatient = async () => {
    if (!patient) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/practitioner/patients/${patient.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Could not remove patient");
      }
      toast.success("Patient removed from your practice list");
      setRemoveConfirmOpen(false);
      router.push("/practitioner/patients");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove patient");
    }
    setActionLoading(false);
  };

  const handlePrescriptionSubmit = async () => {
    if (!patient || !prescriptionForm.medicationName) return;
    if (!prescriptionFile) {
      toast.error(
        "Attach the formal prescription PDF/image (letterhead) so the patient can take it to a pharmacy.",
      );
      return;
    }
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append("patientId", patient.id);
      formData.append("medicationName", prescriptionForm.medicationName);
      formData.append("dosage", prescriptionForm.dosage || "");
      formData.append("instructions", prescriptionForm.instructions || "");
      formData.append(
        "refillsRemaining",
        String(prescriptionForm.refillsRemaining || 0),
      );
      formData.append("notifyChat", "true");
      formData.append("file", prescriptionFile);

      const res = await fetch("/api/practitioner/prescriptions", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        toast.success(
          "Prescription issued — patient notified with downloadable script in Messages & Meds",
        );
        setIsPrescriptionModalOpen(false);
        setPrescriptionForm({
          medicationName: "",
          dosage: "",
          instructions: "",
          refillsRemaining: 0,
        });
        setPrescriptionFile(null);
        const refreshRes = await fetch(`/api/practitioner/patients/${id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setPatient(refreshData.data);
      } else {
        toast.error(json.error || "Failed to issue prescription");
      }
    } catch {
      toast.error("Network error");
    }
    setActionLoading(false);
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
    try {
      const res = await fetch(`/api/practitioner/patients/${id}/vitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vitalsFormData),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Vitals updated successfully");
        setIsVitalsModalOpen(false);
        setPatient((prev) => (prev ? { ...prev, vitals: data.data } : null));
      } else {
        toast.error("Failed to update vitals");
      }
    } catch {
      toast.error("Network error while updating");
    }
    setActionLoading(false);
  };

  const handleStartChat = async () => {
    if (!patient) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          contactId: patient.id,
        }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.conversationId) {
        router.push(`/practitioner/messages?chatId=${data.conversationId}`);
      } else {
        router.push(`/practitioner/messages?patientId=${patient.id}`);
      }
    } catch {
      router.push(`/practitioner/messages?patientId=${patient.id}`);
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
        <p className="text-sm font-bold text-slate-500 tracking-normal">
          Retrieving Health Record...
        </p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50 gap-6 p-8">
        <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
          <BiUser size={40} />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-800 font-grotesk">
            Record Not Found
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            The health record you&apos;re looking for might be unavailable or
            you might not have access.
          </p>
        </div>
        <Link
          href="/practitioner/patients"
          className="px-6 py-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
        >
          Return to Patient List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      <PatientProfileHeader
        patient={patient}
        age={age}
        actionLoading={actionLoading}
        onStartChat={handleStartChat}
        onDownloadReport={handleDownloadReport}
        onBookAppointment={() => setShowBooking(true)}
        onRemove={() => setRemoveConfirmOpen(true)}
      />

      <VitalCardsGrid
        patientId={patient.id}
        riskScore={patient.riskScore || 0}
        onCardClick={() => setIsVitalsModalOpen(true)}
        vitalsData={patient?.vitals}
        onRiskSaved={(score, band) => {
          setPatient((prev) =>
            prev
              ? {
                  ...prev,
                  riskScore: score,
                  riskColor: band,
                  riskLabel:
                    band === "green"
                      ? "Low risk"
                      : band === "gray"
                        ? "Mild risk"
                        : band === "orange"
                          ? "Moderate risk"
                          : "High risk",
                }
              : null,
          );
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Card className="p-0 overflow-hidden h-[600px] relative">
            <MedicalManikin
              gender={(patient.gender as "male" | "female") || "female"}
              heightCm={
                patient.vitals?.height ? Number(patient.vitals.height) : 170
              }
              weightKg={
                patient.vitals?.weight ? Number(patient.vitals.weight) : 70
              }
              readOnly
              patientId={patient.id}
            />
          </Card>

          <ClinicalTimeline
            consultations={patient.pastConsultations}
            patientName={patient.fullName}
            expandedId={expandedConsult}
            onToggle={(cid) =>
              setExpandedConsult((prev) => (prev === cid ? null : cid))
            }
            onOpenSoap={(consultationId, patientName) =>
              setSoapModal({ isOpen: true, consultationId, patientName })
            }
          />

          <PatientDocumentsPanel
            documents={patient.documents || []}
            patientName={patient.fullName}
            patientId={patient.id}
          />

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 font-grotesk px-1">
              Complete Medical Context
            </h3>
            <PatientHealthRecord patientId={patient.id} isPractitioner />
          </div>
        </div>

        <PatientClinicalSidebar
          patient={patient}
          onSyncRecords={() => setIsUpdateModalOpen(true)}
          onIssuePrescription={() => setIsPrescriptionModalOpen(true)}
        />
      </div>

      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() =>
          setSoapModal({ isOpen: false, consultationId: "", patientName: "" })
        }
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />

      <PatientProfileModals
        actionLoading={actionLoading}
        patientName={patient.fullName}
        isPrescriptionOpen={isPrescriptionModalOpen}
        prescriptionForm={prescriptionForm}
        prescriptionFile={prescriptionFile}
        onPrescriptionFormChange={setPrescriptionForm}
        onPrescriptionFileChange={setPrescriptionFile}
        onClosePrescription={() => {
          setIsPrescriptionModalOpen(false);
          setPrescriptionFile(null);
        }}
        onSubmitPrescription={handlePrescriptionSubmit}
        isVitalsOpen={isVitalsModalOpen}
        vitalsForm={vitalsFormData}
        onVitalsFormChange={setVitalsFormData}
        onCloseVitals={() => setIsVitalsModalOpen(false)}
        onSubmitVitals={handleVitalsSubmit}
        isUpdateOpen={isUpdateModalOpen}
        updateForm={updateFormData}
        onUpdateFormChange={setUpdateFormData}
        onCloseUpdate={() => setIsUpdateModalOpen(false)}
        onSubmitUpdate={handleUpdateClinicalData}
        isRemoveOpen={removeConfirmOpen}
        onCloseRemove={() => setRemoveConfirmOpen(false)}
        onConfirmRemove={handleRemovePatient}
      />

      <BookingModal
        isOpen={showBooking}
        mode="practitioner"
        patient={{
          id: patient.id,
          name: patient.fullName,
          email: patient.email,
        }}
        onClose={() => setShowBooking(false)}
        onSuccess={() => {
          setShowBooking(false);
          toast.success("Appointment booked");
        }}
      />
    </div>
  );
}
