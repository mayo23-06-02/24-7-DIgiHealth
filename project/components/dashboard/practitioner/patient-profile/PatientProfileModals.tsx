"use client";

import React from "react";
import { BiErrorCircle, BiInfoCircle } from "react-icons/bi";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type {
  ClinicalUpdateFormState,
  PrescriptionFormState,
  VitalsFormState,
} from "./types";

interface PatientProfileModalsProps {
  actionLoading: boolean;
  patientName?: string;

  isPrescriptionOpen: boolean;
  prescriptionForm: PrescriptionFormState;
  prescriptionFile: File | null;
  prescriptionFileError?: string | null;
  onPrescriptionFormChange: (next: PrescriptionFormState) => void;
  onPrescriptionFileChange: (file: File | null) => void;
  onClosePrescription: () => void;
  onSubmitPrescription: () => void;

  isVitalsOpen: boolean;
  vitalsForm: VitalsFormState;
  onVitalsFormChange: (next: VitalsFormState) => void;
  onCloseVitals: () => void;
  onSubmitVitals: () => void;

  isUpdateOpen: boolean;
  updateForm: ClinicalUpdateFormState;
  onUpdateFormChange: (next: ClinicalUpdateFormState) => void;
  onCloseUpdate: () => void;
  onSubmitUpdate: () => void;

  isRemoveOpen: boolean;
  onCloseRemove: () => void;
  onConfirmRemove: () => void;
}

export default function PatientProfileModals({
  actionLoading,
  patientName,
  isPrescriptionOpen,
  prescriptionForm,
  prescriptionFile,
  prescriptionFileError,
  onPrescriptionFormChange,
  onPrescriptionFileChange,
  onClosePrescription,
  onSubmitPrescription,
  isVitalsOpen,
  vitalsForm,
  onVitalsFormChange,
  onCloseVitals,
  onSubmitVitals,
  isUpdateOpen,
  updateForm,
  onUpdateFormChange,
  onCloseUpdate,
  onSubmitUpdate,
  isRemoveOpen,
  onCloseRemove,
  onConfirmRemove,
}: PatientProfileModalsProps) {
  return (
    <>
      <Modal
        isOpen={isPrescriptionOpen}
        onClose={onClosePrescription}
        title="Issue New Prescription"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Input
              label="Medication Name"
              placeholder="e.g. Amoxicillin 500mg"
              value={prescriptionForm.medicationName}
              onChange={(e) =>
                onPrescriptionFormChange({
                  ...prescriptionForm,
                  medicationName: e.target.value,
                })
              }
              required
            />
            <Input
              label="Dosage"
              placeholder="e.g. One tablet twice daily"
              value={prescriptionForm.dosage}
              onChange={(e) =>
                onPrescriptionFormChange({
                  ...prescriptionForm,
                  dosage: e.target.value,
                })
              }
            />
            <div className="space-y-2">
              <h1 className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">
                Instructions
              </h1>
              <textarea
                className="w-full min-h-[100px] p-4 rounded-lg bg-slate-50 border border-slate-100 outline-none focus:border-primary/50 text-sm text-slate-700 font-medium transition-all"
                placeholder="Specific instructions for the patient..."
                value={prescriptionForm.instructions}
                onChange={(e) =>
                  onPrescriptionFormChange({
                    ...prescriptionForm,
                    instructions: e.target.value,
                  })
                }
              />
            </div>
            <Input
              label="Refills Remaining"
              type="number"
              placeholder="0"
              value={prescriptionForm.refillsRemaining}
              onChange={(e) =>
                onPrescriptionFormChange({
                  ...prescriptionForm,
                  refillsRemaining: parseInt(e.target.value) || 0,
                })
              }
            />
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">
                Formal script (PDF / image) *
              </label>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp,image/gif,.doc,.docx"
                onChange={(e) =>
                  onPrescriptionFileChange(e.target.files?.[0] || null)
                }
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-bold hover:file:bg-primary/20"
                required
              />
              {prescriptionFileError ? (
                <p className="flex items-start gap-1.5 text-xs text-rose-600 font-semibold">
                  <BiErrorCircle size={14} className="shrink-0 mt-0.5" />
                  {prescriptionFileError}
                </p>
              ) : prescriptionFile ? (
                <p className="text-xs text-emerald-700 font-semibold">
                  Attached: {prescriptionFile.name}
                </p>
              ) : null}
              <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
                <BiInfoCircle size={13} className="shrink-0 mt-0.5" />
                PDF, Word (.doc/.docx), or image (JPG/PNG/WebP/GIF). Max 15MB
                (10MB for images). Required for pharmacy use (letterhead with
                registration / legal details).
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              onClick={onSubmitPrescription}
              disabled={
                actionLoading ||
                !prescriptionForm.medicationName ||
                !prescriptionFile ||
                !!prescriptionFileError
              }
            >
              {actionLoading ? "Issuing..." : "Confirm & Issue Prescription"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClosePrescription}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isVitalsOpen}
        onClose={onCloseVitals}
        title="Update Patient Vitals"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Heart Rate (BPM)"
              placeholder="e.g. 72"
              value={vitalsForm.heartRate}
              onChange={(e) =>
                onVitalsFormChange({ ...vitalsForm, heartRate: e.target.value })
              }
            />
            <Input
              label="Blood Pressure (mmHg)"
              placeholder="e.g. 120/80"
              value={vitalsForm.bloodPressure}
              onChange={(e) =>
                onVitalsFormChange({
                  ...vitalsForm,
                  bloodPressure: e.target.value,
                })
              }
            />
            <Input
              label="Body Mass (kg)"
              placeholder="e.g. 70"
              value={vitalsForm.bodyMass}
              onChange={(e) =>
                onVitalsFormChange({ ...vitalsForm, bodyMass: e.target.value })
              }
            />
            <Input
              label="Blood Glucose (mmol/L)"
              placeholder="e.g. 5.5"
              value={vitalsForm.glucose}
              onChange={(e) =>
                onVitalsFormChange({ ...vitalsForm, glucose: e.target.value })
              }
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              onClick={onSubmitVitals}
              disabled={actionLoading}
            >
              {actionLoading ? "Updating..." : "Save Vitals"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={onCloseVitals}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isUpdateOpen}
        onClose={onCloseUpdate}
        title="Sync Patient Records"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            {(
              [
                ["medicalHistory", "Chronic Conditions (Comma separated)"],
                ["allergies", "Allergies (Comma separated)"],
                ["currentMedications", "Active Medications (Comma separated)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <h1 className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">
                  {label}
                </h1>
                <textarea
                  className="w-full min-h-[80px] p-4 rounded-lg bg-slate-50 border border-slate-100 outline-none focus:border-primary/50 text-sm text-slate-700 font-medium transition-all"
                  value={updateForm[key]}
                  onChange={(e) =>
                    onUpdateFormChange({ ...updateForm, [key]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              onClick={onSubmitUpdate}
              disabled={actionLoading}
            >
              {actionLoading ? "Updating..." : "Save Clinical Records"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={onCloseUpdate}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRemoveOpen}
        onClose={onCloseRemove}
        title="Remove patient from practice"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            Remove <strong>{patientName}</strong> from your assigned patient
            list? Their account and clinical records are kept — they will only
            leave your practice roster.
          </p>
          <div className="flex gap-3">
            <Button
              className="flex-1 !bg-red-600 hover:!bg-red-700"
              onClick={onConfirmRemove}
              disabled={actionLoading}
            >
              {actionLoading ? "Removing…" : "Yes, remove"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCloseRemove}
              disabled={actionLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
