"use client";

import React, { useCallback, useRef, useState } from "react";
import { BiCloudUpload, BiFile, BiLoaderAlt, BiX } from "react-icons/bi";
import { useMediaUpload, type UploadedMedia } from "./useMediaUpload";
import type { MediaPurpose } from "@/lib/supabase/media-types";

export interface UploadDropzoneProps {
  purpose: MediaPurpose;
  label?: string;
  accept?: string;
  conversationId?: string;
  patientId?: string;
  facilityId?: string;
  isPublic?: boolean;
  publicRegistration?: boolean;
  registrationToken?: string;
  onRegistrationToken?: (token: string) => void;
  value?: string | null;
  onUploaded?: (asset: UploadedMedia) => void;
  onClear?: () => void;
  className?: string;
}

export default function UploadDropzone({
  purpose,
  label = "Upload file",
  accept = "image/*,.pdf,application/pdf,video/*,audio/*",
  conversationId,
  patientId,
  facilityId,
  isPublic,
  publicRegistration,
  registrationToken,
  onRegistrationToken,
  value,
  onUploaded,
  onClear,
  className = "",
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, progress, uploading, error } = useMediaUpload();
  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setLocalError(null);
      setFileName(file.name);
      try {
        const asset = await upload(file, {
          purpose,
          conversationId,
          patientId,
          facilityId,
          isPublic,
          publicRegistration,
          registrationToken,
        });
        if ((asset as any).registrationToken && onRegistrationToken) {
          onRegistrationToken((asset as any).registrationToken);
        }
        onUploaded?.(asset);
      } catch (e: any) {
        setLocalError(e.message || "Upload failed");
      }
    },
    [
      upload,
      purpose,
      conversationId,
      patientId,
      facilityId,
      isPublic,
      publicRegistration,
      registrationToken,
      onRegistrationToken,
      onUploaded,
    ],
  );

  const displayError = localError || error;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <p className="text-sm font-bold text-slate-600 tracking-wide">{label}</p>
      )}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (uploading) return;
          void handleFile(e.dataTransfer.files?.[0] || null);
        }}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          uploading
            ? "border-primary/40 bg-primary/5"
            : "border-slate-200 bg-slate-50 hover:border-primary/50 hover:bg-slate-100"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={uploading}
          onChange={(e) => void handleFile(e.target.files?.[0] || null)}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <BiLoaderAlt className="animate-spin text-primary" size={28} />
            <p className="text-sm font-semibold text-slate-700">
              Uploading… {progress}%
            </p>
            <div className="w-full max-w-xs h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : value || fileName ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <BiFile size={22} />
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate max-w-[220px]">
                {fileName || "File attached"}
              </p>
              {value && (
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary font-semibold hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View
                </a>
              )}
            </div>
            {onClear && (
              <button
                type="button"
                className="ml-2 p-1.5 rounded-lg hover:bg-slate-200 text-slate-500"
                onClick={(e) => {
                  e.stopPropagation();
                  setFileName(null);
                  onClear();
                }}
              >
                <BiX size={18} />
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 text-primary flex items-center justify-center">
              <BiCloudUpload size={26} />
            </div>
            <p className="text-sm font-bold text-slate-600">
              Click or drag & drop to upload
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Images, PDF, video, audio
            </p>
          </>
        )}
      </div>
      {displayError && (
        <p className="text-xs text-red-600 font-medium">{displayError}</p>
      )}
    </div>
  );
}
