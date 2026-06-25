"use client";
import React from "react";
import CloudinaryUpload from "@/components/ui/CloudinaryUpload";

export default function PatientStep3({ formData, updateData }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">
          Documents & Verification
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <CloudinaryUpload
          label="Profile Photo / ID Photo *"
          description="Upload a clear photo of yourself or your ID card (JPG, PNG, or PDF)"
          value={formData.profilePhoto}
          onUploadComplete={(url) => updateData("profilePhoto", url)}
        />

        <CloudinaryUpload
          label="Medical Certificates / Documents"
          description="Upload any relevant medical certificates or health records (PDF or Images)"
          value={formData.medicalDocument}
          onUploadComplete={(url) => updateData("medicalDocument", url)}
        />
      </div>

      <div className="p-5 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs text-gray-700 font-medium leading-relaxed">
          <strong>Note:</strong> These documents help our medical team provide
          better care. All documents are stored securely and encrypted.
        </p>
      </div>
    </div>
  );
}
