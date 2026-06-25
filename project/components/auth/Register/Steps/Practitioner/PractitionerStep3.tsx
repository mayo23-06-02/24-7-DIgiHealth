"use client";
import React from "react";
import CloudinaryUpload from "@/components/ui/CloudinaryUpload";

export default function PractitionerStep3({
  formData,
  updateData,
  errors,
}: any) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <CloudinaryUpload
        label="Profile Photo *"
        description="Select or drag a professional headshot for your practitioner profile"
        value={formData.profilePhoto}
        onUploadComplete={(url) => updateData("profilePhoto", url)}
      />

      <CloudinaryUpload
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
    </div>
  );
}
