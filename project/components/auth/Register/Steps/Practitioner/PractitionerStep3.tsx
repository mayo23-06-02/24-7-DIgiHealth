"use client";
import React from "react";
import Link from "next/link";
import DocumentUpload from "@/components/ui/DocumentUpload";

export default function PractitionerStep3({
  formData,
  updateData,
  errors,
}: any) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <DocumentUpload
        label="Profile Photo *"
        description="Select or drag a professional headshot for your practitioner profile"
        value={formData.profilePhoto}
        onUploadComplete={(url) => updateData("profilePhoto", url)}
      />

      <DocumentUpload
        label="HPCSA Registration Certificate *"
        description="Upload a certified copy of your HPCSA registration"
        accept="application/pdf"
        value={formData.hpcsaCert}
        onUploadComplete={(url) => updateData("hpcsaCert", url)}
      />

      <label
        className={`flex items-start gap-4 p-6 rounded-lg border-2 cursor-pointer transition-all ${
          formData.bgCheckConsent
            ? "border-primary bg-primary/5"
            : "border-slate-100 bg-slate-50"
        }`}
      >
        <input
          type="checkbox"
          checked={formData.bgCheckConsent || false}
          onChange={(e) => updateData("bgCheckConsent", e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-primary shrink-0"
        />
        <span className="text-sm font-bold text-slate-700 leading-relaxed">
          I consent to a professional background verification via the 24/7
          TeleHealth vetted network.
        </span>
      </label>
      {errors?.bgCheckConsent && (
        <p className="text-xs font-bold text-red-500">
          {errors.bgCheckConsent}
        </p>
      )}

      <label
        className={`flex items-start gap-4 p-6 rounded-lg border-2 cursor-pointer transition-all ${
          formData.practitionerConsent
            ? "border-primary bg-primary/5"
            : "border-slate-100 bg-slate-50"
        }`}
      >
        <input
          type="checkbox"
          checked={formData.practitionerConsent || false}
          onChange={(e) => updateData("practitionerConsent", e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-primary shrink-0"
        />
        <span className="text-sm font-bold text-slate-700 leading-relaxed">
          I consent to 24/7 DigiMedCare processing my personal information,
          professional registration details, qualifications, practice
          information, verification documents, banking details and platform
          activity for purposes of practitioner onboarding, verification,
          service delivery, payment administration, compliance and platform
          governance.
        </span>
      </label>
      {errors?.practitionerConsent && (
        <p className="text-xs font-bold text-red-500">
          {errors.practitionerConsent}
        </p>
      )}

      <label
        className={`flex items-start gap-4 p-6 rounded-lg border-2 cursor-pointer transition-all ${
          formData.practitionerTermsAccepted
            ? "border-primary bg-primary/5"
            : "border-slate-100 bg-slate-50"
        }`}
      >
        <input
          type="checkbox"
          checked={formData.practitionerTermsAccepted || false}
          onChange={(e) =>
            updateData("practitionerTermsAccepted", e.target.checked)
          }
          className="mt-0.5 w-5 h-5 accent-primary shrink-0"
        />
        <span className="text-sm font-bold text-slate-700 leading-relaxed">
          I have read and agree to the{" "}
          <Link
            href="/practitioner-terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline decoration-2 underline-offset-4"
          >
            Practitioner Terms and Conditions
          </Link>
          .
        </span>
      </label>
      {errors?.practitionerTermsAccepted && (
        <p className="text-xs font-bold text-red-500">
          {errors.practitionerTermsAccepted}
        </p>
      )}
    </div>
  );
}
