"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BiCloudUpload } from "react-icons/bi";
import FileCard from "./FileCard";
import MediaPreviewModal from "./MediaPreviewModal";
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
  const { upload, abort, progress, etaSeconds, uploading, error } = useMediaUpload();
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Revoke the blob URL when it's replaced or the component unmounts, so we
  // don't leak memory holding the file in the browser indefinitely.
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setLocalError(null);
      setFileName(file.name);
      setFileSize(file.size);
      setFileMimeType(file.type || null);
      // Preview from the in-memory file immediately — during registration
      // there's no session yet, so the server's /api/media/file/[id] proxy
      // would 401. This also means "View" works instantly, before the
      // upload even finishes.
      setLocalPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
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
        if (e?.name === "UploadAbortedError") {
          setFileName(null);
          setFileSize(null);
          setFileMimeType(null);
          if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
          setLocalPreviewUrl(null);
          return;
        }
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
      localPreviewUrl,
    ],
  );

  const displayError = localError || error;
  const hasAttachment = value || fileName;

  const clear = () => {
    setFileName(null);
    setFileSize(null);
    setFileMimeType(null);
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
    onClear?.();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <p className="text-sm font-bold text-slate-600 tracking-wide">{label}</p>
      )}

      {uploading || hasAttachment ? (
        <FileCard
          fileName={fileName || "File attached"}
          fileSize={fileSize}
          mimeType={fileMimeType}
          uploading={uploading}
          progress={progress}
          etaSeconds={etaSeconds}
          previewUrl={localPreviewUrl || value}
          onView={() => setPreviewOpen(true)}
          onCancel={abort}
          onRemove={onClear ? clear : undefined}
        />
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void handleFile(e.dataTransfer.files?.[0] || null);
          }}
          className="relative border border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors border-slate-200 hover:border-primary/50 hover:bg-slate-50"
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0] || null)}
          />
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 text-primary flex items-center justify-center">
            <BiCloudUpload size={26} />
          </div>
          <p className="text-sm font-bold text-slate-600">
            Click or drag & drop to upload
          </p>
          <p className="text-xs text-slate-500 mt-1">Images, PDF, video, audio</p>
        </div>
      )}

      {displayError && (
        <p className="text-xs text-red-600 font-medium">{displayError}</p>
      )}
      {previewOpen && (localPreviewUrl || value) && (
        <MediaPreviewModal
          url={(localPreviewUrl || value) as string}
          mimeType={fileMimeType}
          fileName={fileName}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
