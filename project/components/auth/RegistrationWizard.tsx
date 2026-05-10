"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PatientStep1,
  PatientAnthropometricStep,
  PatientPaymentStep,
  PatientEmergencyStep,
  POPIAConsentStep,
  PatientDocumentStep,
  PasswordCreationStep,
} from "./steps/PatientWizardSteps";
import {
  PractitionerStep1,
  PractitionerStep2,
  PractitionerStep3,
  PractitionerStep4,
} from "./steps/PractitionerWizardSteps";
import {
  HospitalStep1,
  HospitalStep2,
  HospitalStep3,
  HospitalStep4,
} from "./steps/HospitalWizardSteps";

import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";

// ─── Role config ─────────────────────────────────────────────────────────────
const roleConfig: Record<
  string,
  { label: string; color: string; steps: string[] }
> = {
  patient: {
    label: "Medical Cover",
    color: "#4493b8",
    steps: [
      "Identity",
      "Privacy Consent",
      "Health Profile",
      "Payment Setup",
      "Emergency & Info",
      "Documents",
      "Security",
      "Preview",
    ],
  },
  practitioner: {
    label: "Healthcare Professional",
    color: "#4493b8",
    steps: [
      "Credentials",
      "Identity & Contact",
      "Documents",
      "Banking & Tax",
      "Security",
      "Preview",
    ],
  },
  hospital: {
    label: "Healthcare Provider",
    color: "#4493b8",
    steps: [
      "Facility Details",
      "Address & Admin",
      "B2B Agreement",
      "Facility Media",
      "Security",
      "Preview",
    ],
  },
};

// ─── Skippable steps (no validation required) ────────────────────────────────
// patient step 3 (Health Profile) and step 5 (Emergency & Photo) are optional
const skippableSteps: Record<string, number[]> = {
  patient: [3, 5],
};

function PreviewStep({ formData }: { formData: any }) {
  const previewData = { ...formData };
  delete previewData.password;
  delete previewData.confirmPassword;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 px-4 py-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">
          Application Preview
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Please review your details before final submission.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(previewData).map(([key, value]) => {
          if (value === undefined || value === null || value === "")
            return null;
          let displayValue = String(value);
          if (typeof value === "boolean") displayValue = value ? "Yes" : "No";
          else if (Array.isArray(value)) displayValue = value.join(", ");
          else if (typeof value === "object") {
            if (value && (value as any).url) displayValue = "Uploaded Document";
            else return null;
          }

          const formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());

          return (
            <div
              key={key}
              className="p-4 bg-slate-50 rounded-xl border border-slate-100"
            >
              <p className="text-xs font-bold text-slate-500 mb-1">
                {formattedKey}
              </p>
              <p className="text-sm font-semibold text-slate-800 break-words">
                {displayValue}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step renderer ────────────────────────────────────────────────────────────
function renderStep(
  role: string,
  step: number,
  formData: any,
  updateData: (k: string, v: any) => void,
  errors: any,
  onSkip: () => void,
) {
  const totalSteps = roleConfig[role]?.steps.length;
  if (step === totalSteps) {
    return <PreviewStep formData={formData} />;
  }
  if (role === "patient") {
    if (step === 1)
      return (
        <PatientStep1
          formData={formData}
          updateData={updateData}
          errors={errors}
        />
      );
    if (step === 2)
      return <POPIAConsentStep formData={formData} updateData={updateData} />;
    if (step === 3)
      return (
        <PatientAnthropometricStep
          formData={formData}
          updateData={updateData}
          onSkip={onSkip}
        />
      );
    if (step === 4)
      return <PatientPaymentStep formData={formData} updateData={updateData} />;
    if (step === 5)
      return (
        <PatientEmergencyStep
          formData={formData}
          updateData={updateData}
          onSkip={onSkip}
        />
      );
    if (step === 6)
      return (
        <PatientDocumentStep formData={formData} updateData={updateData} />
      );
    if (step === 7)
      return (
        <PasswordCreationStep
          formData={formData}
          updateData={updateData}
          errors={errors}
        />
      );
  }
  if (role === "practitioner") {
    if (step === 1)
      return (
        <PractitionerStep1
          formData={formData}
          updateData={updateData}
          errors={errors}
        />
      );
    if (step === 2)
      return (
        <PractitionerStep2
          formData={formData}
          updateData={updateData}
          errors={errors}
        />
      );
    if (step === 3)
      return <PractitionerStep3 formData={formData} updateData={updateData} />;
    if (step === 4)
      return <PractitionerStep4 formData={formData} updateData={updateData} />;
    if (step === 5)
      return (
        <PasswordCreationStep
          formData={formData}
          updateData={updateData}
          errors={errors}
        />
      );
  }
  if (role === "hospital") {
    if (step === 1)
      return (
        <HospitalStep1
          formData={formData}
          updateData={updateData}
          errors={errors}
        />
      );
    if (step === 2)
      return <HospitalStep2 formData={formData} updateData={updateData} />;
    if (step === 3)
      return <HospitalStep3 formData={formData} updateData={updateData} />;
    if (step === 4)
      return <HospitalStep4 formData={formData} updateData={updateData} />;
    if (step === 5)
      return (
        <PasswordCreationStep
          formData={formData}
          updateData={updateData}
          errors={errors}
        />
      );
  }

  return null;
}

// ─── Validation ──────────────────────────────────────────────────────────────
function validateStep(
  role: string,
  step: number,
  formData: any,
): Record<string, string> {
  const err: Record<string, string> = {};
  if (role === "patient" && step === 1) {
    if (!formData.firstName?.trim()) err.firstName = "First name is required.";
    if (!formData.saId || formData.saId.length !== 13)
      err.saId = "SA ID must be exactly 13 digits.";
    const cleanMobile = formData.mobile?.replace(/\s+/g, "");
    if (!cleanMobile?.match(/^(\+27|0)[6-8][0-9]{8}$/))
      err.mobile = "Enter a valid SA mobile number.";
    if (!formData.email?.trim() || !formData.email.includes("@"))
      err.email = "A valid email address is required.";
    if (!formData.gender)
      err.gender = "Please select your biological gender.";
  }
  if (role === "practitioner" && step === 1) {
    if (!formData.hpcsaNumber?.match(/^[A-Z]{2}\d{5,7}$/))
      err.hpcsaNumber = "Format: 2 letters + 5–7 digits (e.g. MP123456).";
    if (!formData.specialization)
      err.specialization = "Please select a specialisation.";
    if (!formData.practiceNumber?.trim())
      err.practiceNumber = "Practice number is required.";
  }
  if (role === "hospital" && step === 1) {
    if (!formData.facilityName?.trim())
      err.facilityName = "Facility name is required.";
    if (!formData.dohRegNumber?.trim())
      err.dohRegNumber = "DoH Registration number is required.";
  }

  if (role === "practitioner" && step === 2) {
    const cleanMobile = formData.mobile?.replace(/\s+/g, "");
    if (!cleanMobile?.match(/^(\+27|0)[6-8][0-9]{8}$/))
      err.mobile = "Enter a valid SA mobile number.";
    if (!formData.email?.trim() || !formData.email.includes("@"))
      err.email = "A valid email address is required.";
    if (!formData.languages || formData.languages.length === 0)
      err.languages = "Please select at least one language.";
  }
  if (role === "hospital" && step === 2) {
    if (!formData.adminEmail?.trim() || !formData.adminEmail.includes("@"))
      err.adminEmail = "A valid work email address is required.";
  }
  // POPIA step: patient step 2
  if (role === "patient" && step === 2) {
    if (!formData.consent) err.consent = "POPIA consent is required.";
  }

  // Password validation (Always the second to last step)
  const totalSteps = roleConfig[role]?.steps.length;
  if (step === totalSteps - 1) {
    if (!formData.password) {
      err.password = "Password is required.";
    } else if (formData.password.length < 8) {
      err.password = "Password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(formData.password)) {
      err.password = "Password must contain at least one uppercase letter.";
    } else if (!/[0-9]/.test(formData.password)) {
      err.password = "Password must contain at least one number.";
    }

    if (formData.password !== formData.confirmPassword) {
      err.confirmPassword = "Passwords do not match.";
    }
  }

  return err;
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function RegistrationWizard({ role }: { role: string }) {
  const router = useRouter();
  // Ensure we always use the correct role – never fall back silently
  const safeRole = Object.keys(roleConfig).includes(role) ? role : "patient";
  const config = roleConfig[safeRole];
  const totalSteps = config.steps.length;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false); // non-blocking banner
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Role-scoped draft key so patient/emt/etc never share drafts
  const DRAFT_KEY = `reg_draft_v2_${safeRole}`;

  // Online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Load draft on mount – show as banner, never block the form
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const lf = (await import("localforage")).default;
        const draft: any = await lf.getItem(DRAFT_KEY);
        if (draft?.formData && Object.keys(draft.formData).length > 0) {
          setShowDraftBanner(true);
        }
      } catch {
        /* ignore */
      }
    };
    loadDraft();
  }, [DRAFT_KEY]);

  // Auto-save on every data change (debounced 500ms)
  useEffect(() => {
    const saveDraft = async () => {
      try {
        const lf = (await import("localforage")).default;
        await lf.setItem(DRAFT_KEY, { formData, step, ts: Date.now() });
      } catch {}
    };
    const t = setTimeout(saveDraft, 500);
    return () => clearTimeout(t);
  }, [formData, step, DRAFT_KEY]);

  const restoreDraft = useCallback(async () => {
    const lf = (await import("localforage")).default;
    const draft: any = await lf.getItem(DRAFT_KEY);
    if (draft) {
      setFormData(draft.formData ?? {});
      setStep(draft.step ?? 1);
    }
    setShowDraftBanner(false);
  }, [DRAFT_KEY]);

  const clearDraft = useCallback(async () => {
    const lf = (await import("localforage")).default;
    await lf.removeItem(DRAFT_KEY);
    setShowDraftBanner(false);
    setFormData({});
    setStep(1);
  }, [DRAFT_KEY]);

  const updateData = useCallback(
    (field: string, value: any) => {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
      // Auto-save on change
      import("localforage").then(({ default: lf }) => {
        lf.setItem(DRAFT_KEY, {
          formData: { ...formData, [field]: value },
          step,
          ts: Date.now(),
        });
      });
    },
    [formData, step, DRAFT_KEY],
  );

  const handleNext = () => {
    const errs = validateStep(safeRole, step, formData);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Skip: advance without validation (only allowed for skippable steps)
  const handleSkip = () => {
    setErrors({});
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isSkippable = (skippableSteps[safeRole] ?? []).includes(step);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStep(safeRole, step, formData);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setGlobalError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: safeRole, formData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      await clearDraft();
      router.push("/login?registered=true");
    } catch (err: any) {
      setGlobalError(err.message ?? "Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  const progress = ((step - 1) / Math.max(totalSteps - 1, 1)) * 100;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1300px",
      }}
      className="bg-white custom-scrollbar overflow-y-scroll min-h-[85vh]   max-h-[90vh] px-6 lg:px-10 rounded-lg  w-full max-w-4xl mx-auto relative  animate-in fade-in duration-700"
    >
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-gray-500 text-white text-center text-xs font-bold  tracking-normal py-3 px-6">
          You are offline — progress saved locally. Go online to submit.
        </div>
      )}

      {/* Non-blocking draft restore banner */}
      {showDraftBanner && (
        <div className="bg-primary/5 border-b-2 border-primary/10 px-8 py-4 flex items-center justify-between gap-4">
          <p className="text-sm font-bold text-primary">
            We found a saved {config.label} draft. Resume where you left off?
          </p>
          <div className="flex gap-2 shrink-0">
            <Button onClick={restoreDraft} size="sm">
              Resume
            </Button>
            <Button onClick={clearDraft} variant="white" size="sm">
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Top accent line */}

      <div className="   w-full">
        {/* Header */}
        <div className="flex pt-4 lg:pb   items-start justify-between sticky top-0 z-10 bg-white">
          <div className="py-4 flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 px-[10px]  rounded-full  ">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs  text-primary  tracking-normal">
                {config.label} Registry
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-medium text-slate-900 tracking-tight leading-tight font-grotesk">
              {config.steps[step - 1]} <br />
              <span className="font-bold text-primary">
                {config.label} Application
              </span>
            </h2>
          </div>
          <div className="text-right shrink-0 ml-6 ">
            <p className="text-xs text-slate-300  tracking-normal ">Progress</p>
            <p className="text-3xl font-semibold text-primary leading-none">
              {String(step).padStart(2, "0")}
              <span className="text-slate-200 font-light">
                {" "}
                / {String(totalSteps).padStart(2, "0")}
              </span>
            </p>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2 mb-8">
          {config.steps.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div
                className={`h-1 w-full rounded-full transition-all duration-500 ${i < step ? "bg-primary" : "bg-slate-100"}`}
              />
              <span
                className={`text-xs font-bold  tracking-wider hidden md:block transition-colors ${i + 1 === step ? "text-primary" : "text-slate-300"}`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Global error banner */}
        {globalError && (
          <div className="mb-10 p-5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-4 text-red-600">
            <span className="text-2xl">⚠</span>
            <p className="text-sm font-bold">{globalError}</p>
          </div>
        )}

        {/* Step content — always renders the CORRECT role form */}
        <form
          onSubmit={
            step === totalSteps
              ? handleSubmit
              : (e) => {
                  e.preventDefault();
                  handleNext();
                }
          }
          noValidate
        >
          <div className=" custom-scrollbar">
            {renderStep(
              safeRole,
              step,
              formData,
              updateData,
              errors,
              handleSkip,
            )}
          </div>

          {/* Navigation */}
          <div className="flex flex-col justify-end md:flex-row gap-4 lg:pt-16 mt-6 border-t border-slate-100 py-5">
            {step > 1 && (
              <Button
                type="button"
                variant="white"
                onClick={() => {
                  setStep(step - 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={submitting || (!isOnline && step === totalSteps)}
            >
              {submitting ? (
                <>Processing…</>
              ) : step === totalSteps ? (
                "Complete Registration"
              ) : isSkippable ? (
                `Save & Continue`
              ) : (
                `Continue to ${config.steps[step]}`
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
