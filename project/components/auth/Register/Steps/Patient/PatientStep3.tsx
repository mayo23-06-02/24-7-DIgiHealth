"use client";
import React, { useEffect, useState } from "react";
import DocumentUpload from "@/components/ui/DocumentUpload";
import MultiUploadDropzone from "@/components/media/MultiUploadDropzone";

const REG_TOKEN_KEY = "digihealth_registration_media_token";
const MAX_MEDICAL_DOCS = 3;

export default function PatientStep3({ formData, updateData }: any) {
  // Shared with DocumentUpload's own internal token handling via the same
  // sessionStorage key, so the profile photo and medical documents both
  // land under one registration token to claim after signup.
  const [registrationToken, setRegistrationToken] = useState<string | undefined>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = sessionStorage.getItem(REG_TOKEN_KEY) || undefined;
    if (existing) setRegistrationToken(existing);
  }, []);

  const handleRegistrationToken = (token: string) => {
    setRegistrationToken(token);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(REG_TOKEN_KEY, token);
    }
  };

  const medicalDocuments: string[] = formData.medicalDocuments || [];

  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">
          Documents & Verification
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <DocumentUpload
          label="Profile Photo / ID Photo *"
          description="Upload a clear photo of yourself or your ID card (JPG, PNG, or PDF)"
          value={formData.profilePhoto}
          onUploadComplete={(url) => updateData("profilePhoto", url)}
        />

        <MultiUploadDropzone
          purpose="registration"
          label="Medical Certificates / Documents"
          description={`Upload up to ${MAX_MEDICAL_DOCS} relevant medical certificates or health records (PDF or Images)`}
          maxFiles={MAX_MEDICAL_DOCS}
          publicRegistration
          registrationToken={registrationToken}
          onRegistrationToken={handleRegistrationToken}
          values={medicalDocuments}
          onAdd={(url) =>
            updateData("medicalDocuments", (prev: string[] = []) => [...prev, url])
          }
          onRemove={(url) =>
            updateData("medicalDocuments", (prev: string[] = []) =>
              prev.filter((u) => u !== url),
            )
          }
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
