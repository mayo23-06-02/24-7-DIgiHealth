"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import React, { useState, useEffect, useRef } from "react";
import { BiX, BiSave, BiLoader, BiCheckCircle, BiNote } from "react-icons/bi";

interface SoapNotes {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

interface SoapNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  patientName: string;
  existingNotes?: SoapNotes;
}

type ToastState = { type: "success" | "error"; message: string } | null;

const FIELDS: {
  key: keyof SoapNotes;
  label: string;
  abbr: string;
  hint: string;
  color: string;
}[] = [
  {
    key: "subjective",
    label: "Subjective",
    abbr: "S",
    hint: "Patient's own description — symptoms, history, concerns",
    color: "text-[#0052CC] bg-blue-50 border-blue-100",
  },
  {
    key: "objective",
    label: "Objective",
    abbr: "O",
    hint: "Measurable findings — vitals, exam results, labs",
    color: "text-[#00A3BF] bg-teal-50 border-teal-100",
  },
  {
    key: "assessment",
    label: "Assessment",
    abbr: "A",
    hint: "Diagnosis and clinical impression — differential diagnoses",
    color: "text-purple-600 bg-purple-50 border-purple-100",
  },
  {
    key: "plan",
    label: "Plan",
    abbr: "P",
    hint: "Treatment plan — medications, follow-up, referrals, instructions",
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
];

export default function SoapNoteModal({
  isOpen,
  onClose,
  consultationId,
  patientName,
  existingNotes,
}: SoapNoteModalProps) {
  const [notes, setNotes] = useState<SoapNotes>({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && existingNotes) {
      setNotes({
        subjective: existingNotes.subjective || "",
        objective: existingNotes.objective || "",
        assessment: existingNotes.assessment || "",
        plan: existingNotes.plan || "",
      });
    }
  }, [isOpen, existingNotes]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, notes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/practitioner/consultations/${consultationId}/soap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notes),
        },
      );
      const data = await res.json();
      if (data.success) {
        setToast({ type: "success", message: "SOAP note saved successfully" });
        setTimeout(() => {
          setToast(null);
          onClose();
        }, 1800);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setToast({
        type: "error",
        message: "Failed to save note. Please retry.",
      });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const charCount = Object.values(notes).join("").length;
  const isComplete = FIELDS.every(
    (f) => (notes[f.key] || "").trim().length > 0,
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`SOAP Note — ${patientName}`}
    >
      <div className="space-y-6">
        {/* SOAP Fields */}
        <div className="space-y-6">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`
                    w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center border border-slate-200
                    bg-primary/10 text-primary
                  `}
                >
                  {field.abbr}
                </span>
                <label className="text-sm font-bold text-slate-700">
                  {field.label}
                </label>
                <span className="text-xs text-slate-400 ml-1 hidden sm:block">
                  {field.hint}
                </span>
              </div>
              <Input
                textarea
                rows={4}
                value={notes[field.key] || ""}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.hint}
                className="rounded-[1.5rem] border-slate-100 font-bold text-xs"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-50 flex items-center justify-between gap-4">
          <p className="text-[10px] text-slate-400 font-bold  tracking-normal px-1">
            <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono">
              Ctrl+S
            </kbd>{" "}
            Instant Commit
          </p>
          <div className="flex items-center gap-4">
            <Button
              onClick={onClose}
              variant="ghost"
              className="px-6 bg-slate-50 text-slate-400 hover:text-slate-600 transition-all border-none"
            >
              Discard
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              icon={
                saving ? (
                  <BiLoader className="animate-spin" size={18} />
                ) : (
                  <BiSave size={18} />
                )
              }
              className="shadow-none shadow-primary/20 px-8"
            >
              {saving ? "Syncing..." : "Finalize Note"}
            </Button>
          </div>
        </div>

        {/* Toast Notification (Optional since we use react-hot-toast usually, but keeping local style if preferred) */}
        {toast && (
          <div
            className={`
              fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-sm font-bold shadow-none z-[1000]
              animate-in slide-in-from-bottom-4 zoom-in-95 duration-300
              ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}
            `}
          >
            {toast.type === "success" ? "✅ " : "❌ "}
            {toast.message}
          </div>
        )}
      </div>
    </Modal>
  );
}
