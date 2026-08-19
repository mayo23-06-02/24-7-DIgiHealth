"use client";
import React from "react";
import Button from "@/components/ui/Button";
import StepRenderer from "./StepRenderer";
import { useRegistrationWizard } from "./hooks/useRegistrationWizard";

interface RegistrationWizardProps {
  role: string;
}

export default function RegistrationWizard({ role }: RegistrationWizardProps) {
  const {
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
    isSkippable,
    updateData,
    restoreDraft,
    clearDraft,
    goToNext,
    goToPrevious,
    skipStep,
    submitRegistration,
  } = useRegistrationWizard(role);

  const isLastStep = step === totalSteps;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLastStep) {
      submitRegistration();
    } else {
      goToNext();
    }
  };

  return (
    <div className="bg-white fixed inset-0 z-50 w-screen h-screen rounded-none px-4 flex flex-col overflow-hidden animate-in fade-in duration-700 lg:relative lg:inset-auto lg:w-full lg:h-full lg:max-w-4xl xl:max-w-5xl lg:mx-auto lg:min-h-[85vh] lg:max-h-[90vh] lg:rounded-lg lg:mt-[8vh] lg:px-10">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-gray-500 text-white text-center text-xs font-bold tracking-normal py-3 px-6 flex-shrink-0">
          You are offline — progress saved locally. Go online to submit.
        </div>
      )}

      {/* Hospital invite banner */}
      {inviteInfo && (
        <div className="bg-primary/5 border-b-2 border-primary/10 px-8 py-4 flex-shrink-0">
          <p className="text-sm font-bold text-primary">
            You've been invited to join {inviteInfo.facilityName} as a doctor.
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete your registration below and you'll be added to their staff roster automatically.
          </p>
        </div>
      )}
      {inviteError && (
        <div className="bg-amber-50 border-b-2 border-amber-200 px-8 py-4 flex-shrink-0">
          <p className="text-sm font-bold text-amber-800">{inviteError}</p>
          <p className="text-xs text-amber-700 mt-0.5">
            You can still register normally — ask your hospital admin to resend the invite if needed.
          </p>
        </div>
      )}

      {/* Draft restore banner */}
      {showDraftBanner && (
        <div className="bg-primary/5 border-b-2 border-primary/10 px-8 py-4 flex items-center justify-between gap-4 flex-shrink-0">
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

      {/* Main content – takes remaining space */}
      <div className="flex flex-col flex-1 min-h-0 w-full">
        {/* Header */}
        <div className="flex pt-4 items-start justify-between shrink-0 bg-white">
          <div className="py-4 flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 px-[10px] rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs text-primary tracking-normal">
                {config.label} Registry
              </span>
            </div>
            <h2 className="text-lg md:text-xl text-slate-900 tracking-tight leading-tight font-grotesk">
              {config.steps[step - 1]} <br />
              <span className="text-primary font-medium">
                {config.label} Application
              </span>
            </h2>
          </div>
          <div className="text-right shrink-0 ml-6">
            <p className="text-xs text-slate-300 tracking-normal">Progress</p>
            <p className="text-xl font-semibold text-primary leading-none">
              {String(step).padStart(2, "0")}
              <span className="text-slate-400 font-light">
                {" "}
                / {String(totalSteps).padStart(2, "0")}
              </span>
            </p>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2 mb-8 shrink-0">
          {config.steps.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div
                className={`h-0.5 w-full rounded-full transition-all duration-500 ${
                  i < step ? "bg-primary" : "bg-slate-100"
                }`}
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider hidden md:block transition-colors ${
                  i + 1 === step ? "text-primary" : "text-slate-300"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Global error */}
        {globalError && (
          <div className="mb-10 p-2 bg-red-50 rounded-lg flex items-center gap-4 text-red-600 shrink-0">
            <span className="text-2xl">⚠</span>
            <p className="text-sm font-bold">{globalError}</p>
          </div>
        )}

        {/* Form – flex column with scrollable content and fixed footer */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable step content */}
          <div className="flex-1 overflow-y-auto pr-1 lg:pr-2 custom-scrollbar pb-4">
            <StepRenderer
              role={role}
              step={step}
              formData={formData}
              updateData={updateData}
              errors={errors}
              onSkip={skipStep}
            />
          </div>

          {/* Fixed bottom navigation – always visible */}
          <div className="flex-shrink-0 flex flex-col md:flex-row gap-4 border-t border-slate-100 py-5 bg-white">
            {step > 1 && (
              <Button type="button" variant="white" onClick={goToPrevious} className="md:flex-1">
                Back
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={submitting || (!isOnline && isLastStep)}
              className="md:flex-1"
            >
              {submitting
                ? "Processing…"
                : isLastStep
                  ? "Complete Registration"
                  : isSkippable
                    ? "Save & Continue"
                    : `Continue to ${config.steps[step]}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}