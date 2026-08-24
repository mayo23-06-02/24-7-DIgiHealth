import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import localforage from "localforage";
import { roleConfig, skippableSteps } from "../constants";
import { validateStep } from "../validation";

export function useRegistrationWizard(role: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeRole = Object.keys(roleConfig).includes(role) ? role : "patient";
  const config = roleConfig[safeRole];
  const totalSteps = config.steps.length;
  const DRAFT_KEY = `reg_draft_v2_${safeRole}`;

  const [step, setStep] = useState(1);
  /** Attach to the element that actually scrolls the steps. See scrollToTop. */
  const stepScrollRef = useRef<HTMLDivElement | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  // Guards the auto-save effect until the initial "is there a draft to
  // resume?" check has resolved, so we don't overwrite a saved draft in
  // storage with the fresh, empty in-memory state before the user gets a
  // chance to click "Resume".
  const [draftCheckDone, setDraftCheckDone] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{ facilityName: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Hospital-admin invite link: /register/practitioner?invite=<token>
  // Pre-fills + locks the email and tags formData so /api/auth/register
  // can auto-attach this account to the inviting facility's Staff roster.
  useEffect(() => {
    const token = searchParams.get("invite");
    if (!token || safeRole !== "practitioner") return;

    let cancelled = false;
    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setInviteError(json.error || "This invite link is not valid.");
          return;
        }
        setInviteInfo({ facilityName: json.data.facilityName });
        setFormData((prev: any) => ({
          ...prev,
          email: json.data.email,
          inviteToken: token,
        }));
      })
      .catch(() => {
        if (!cancelled) setInviteError("Could not verify this invite link.");
      });

    return () => {
      cancelled = true;
    };
    // Only re-run if the token itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, safeRole]);

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
      } finally {
        setDraftCheckDone(true);
      }
    };
    loadDraft();
  }, [DRAFT_KEY]);

  // Auto-save debounced. Suppressed until the initial draft check has
  // resolved, and again while the "resume this draft?" banner is showing —
  // otherwise this fires ~500ms after mount with the fresh, empty in-memory
  // formData and clobbers the real draft in storage before the user gets a
  // chance to click "Resume".
  useEffect(() => {
    if (!draftCheckDone || showDraftBanner) return;
    const saveDraft = async () => {
      try {
        await localforage.setItem(DRAFT_KEY, { formData, step, ts: Date.now() });
      } catch {}
    };
    const t = setTimeout(saveDraft, 500);
    return () => clearTimeout(t);
  }, [formData, step, DRAFT_KEY, draftCheckDone, showDraftBanner]);

  const updateData = useCallback(
    // `value` may also be an updater `(prevFieldValue) => nextFieldValue`,
    // matching React's setState pattern — needed so callers updating a list
    // (e.g. appending an uploaded file URL) always merge against the latest
    // state instead of a closure snapshot. Two updates landing close together
    // (two uploads finishing seconds apart) would otherwise race: both read
    // the same stale array and the second overwrites the first's addition.
    (field: string, value: any) => {
      setFormData((prev: any) => {
        const nextFieldValue =
          typeof value === "function" ? value(prev[field]) : value;
        const next = { ...prev, [field]: nextFieldValue };
        // immediate save, computed from the same merge so it can't go stale either
        localforage.setItem(DRAFT_KEY, { formData: next, step, ts: Date.now() });
        return next;
      });
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    },
    [step, DRAFT_KEY]
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

  /**
   * Return to the top of the step that is being shown.
   *
   * This used to call window.scrollTo, which does nothing here: the wizard
   * shell is `overflow-hidden` and the steps scroll inside an inner element,
   * so the window has nothing to scroll. Advancing while scrolled down left
   * the next step opened part-way through it, and anyone who did not think to
   * scroll back up would simply not see the fields above.
   *
   * The ref is registered by the wizard (see `stepScrollRef`); the window call
   * remains as a fallback for any caller that renders the steps in normal page
   * flow instead.
   */
  const scrollToTop = () => {
    const el = stepScrollRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToNext = () => {
    const errs = validateStep(safeRole, step, formData);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return false;
    }
    setErrors({});
    setStep(step + 1);
    scrollToTop();
    return true;
  };

  const goToPrevious = () => {
    setStep(step - 1);
    scrollToTop();
  };

  const skipStep = () => {
    setErrors({});
    setStep(step + 1);
    scrollToTop();
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
      // Account created — confirm email ownership with a 6-digit code next
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
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
    inviteInfo,
    inviteError,
    config,
    progress,
    isSkippable,
    updateData,
    restoreDraft,
    clearDraft,
    stepScrollRef,
    goToNext,
    goToPrevious,
    skipStep,
    submitRegistration,
    setGlobalError,
  };
}