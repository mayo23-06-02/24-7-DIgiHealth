import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import localforage from "localforage";
import { roleConfig, skippableSteps } from "../constants";
import { validateStep } from "../validation";

export function useRegistrationWizard(role: string) {
  const router = useRouter();
  const safeRole = Object.keys(roleConfig).includes(role) ? role : "patient";
  const config = roleConfig[safeRole];
  const totalSteps = config.steps.length;
  const DRAFT_KEY = `reg_draft_v2_${safeRole}`;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

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

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft: any = await localforage.getItem(DRAFT_KEY);
        if (draft?.formData && Object.keys(draft.formData).length > 0) {
          setShowDraftBanner(true);
        }
      } catch {
        /* ignore */
      }
    };
    loadDraft();
  }, [DRAFT_KEY]);

  // Auto-save debounced
  useEffect(() => {
    const saveDraft = async () => {
      try {
        await localforage.setItem(DRAFT_KEY, { formData, step, ts: Date.now() });
      } catch {}
    };
    const t = setTimeout(saveDraft, 500);
    return () => clearTimeout(t);
  }, [formData, step, DRAFT_KEY]);

  const updateData = useCallback(
    (field: string, value: any) => {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
      // immediate save
      localforage.setItem(DRAFT_KEY, {
        formData: { ...formData, [field]: value },
        step,
        ts: Date.now(),
      });
    },
    [formData, step, DRAFT_KEY]
  );

  const restoreDraft = useCallback(async () => {
    const draft: any = await localforage.getItem(DRAFT_KEY);
    if (draft) {
      setFormData(draft.formData ?? {});
      setStep(draft.step ?? 1);
    }
    setShowDraftBanner(false);
  }, [DRAFT_KEY]);

  const clearDraft = useCallback(async () => {
    await localforage.removeItem(DRAFT_KEY);
    setShowDraftBanner(false);
    setFormData({});
    setStep(1);
  }, [DRAFT_KEY]);

  const goToNext = () => {
    const errs = validateStep(safeRole, step, formData);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return false;
    }
    setErrors({});
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  };

  const goToPrevious = () => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const skipStep = () => {
    setErrors({});
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isSkippable = (skippableSteps[safeRole] ?? []).includes(step);

  const submitRegistration = async () => {
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
      if (!response.ok) throw new Error(data.error || "Registration failed");
      await clearDraft();
      const email = (
        formData.email ||
        formData.adminEmail ||
        data.email ||
        ""
      )
        .toString()
        .trim()
        .toLowerCase();
      // Account created — user must verify email before login
      router.push(
        `/verify-email?email=${encodeURIComponent(email)}&registered=1`,
      );
    } catch (err: any) {
      setGlobalError(err.message ?? "Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  const progress = ((step - 1) / Math.max(totalSteps - 1, 1)) * 100;

  return {
    step,
    totalSteps,
    formData,
    errors,
    isOnline,
    submitting,
    showDraftBanner,
    globalError,
    config,
    progress,
    isSkippable,
    updateData,
    restoreDraft,
    clearDraft,
    goToNext,
    goToPrevious,
    skipStep,
    submitRegistration,
    setGlobalError,
  };
}