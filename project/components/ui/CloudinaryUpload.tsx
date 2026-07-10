"use client";
/**
 * @deprecated Name kept for registration step imports.
 * Now uses unified Supabase media system (UploadDropzone).
 */
import React, { useEffect, useState } from "react";
import UploadDropzone from "@/components/media/UploadDropzone";

interface CloudinaryUploadProps {
  label: string;
  description?: string;
  onUploadComplete: (url: string) => void;
  accept?: string;
  value?: string;
  purpose?: "registration" | "facility" | "document" | "avatar";
  /** When true (default for registration), no JWT required */
  publicRegistration?: boolean;
}

const REG_TOKEN_KEY = "digihealth_registration_media_token";

const CloudinaryUpload: React.FC<CloudinaryUploadProps> = ({
  label,
  description = "Upload photos, PDFs or certificates",
  onUploadComplete,
  accept = "image/*,application/pdf",
  value,
  purpose = "registration",
  publicRegistration = true,
}) => {
  const [registrationToken, setRegistrationToken] = useState<string | undefined>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = sessionStorage.getItem(REG_TOKEN_KEY) || undefined;
    if (existing) setRegistrationToken(existing);
  }, []);

  return (
    <div className="space-y-2 w-full">
      {description && (
        <p className="text-xs text-slate-500 -mt-1 mb-1">{description}</p>
      )}
      <UploadDropzone
        purpose={purpose}
        label={label}
        accept={accept}
        value={value}
        publicRegistration={publicRegistration}
        registrationToken={registrationToken}
        onRegistrationToken={(token) => {
          setRegistrationToken(token);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(REG_TOKEN_KEY, token);
          }
        }}
        onUploaded={(asset) => {
          const token = (asset as any).registrationToken as string | undefined;
          if (token) {
            setRegistrationToken(token);
            if (typeof window !== "undefined") {
              sessionStorage.setItem(REG_TOKEN_KEY, token);
            }
          }
          onUploadComplete(asset.url);
        }}
        onClear={() => onUploadComplete("")}
      />
    </div>
  );
};

export default CloudinaryUpload;
