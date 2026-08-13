"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BiCloudUpload, BiFile, BiImage, BiTrash, BiX } from "react-icons/bi";
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

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatEta(seconds: number | null): string | null {
  if (seconds === null) return null;
  if (seconds < 60) return `${seconds} sec left`;
  const mins = Math.ceil(seconds / 60);
  return `${mins} min left`;
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
  const isImage = fileMimeType?.startsWith("image/");
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
        <div
          className={`flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs ${
            !uploading && (localPreviewUrl || value) ? "cursor-pointer hover:border-primary/40" : ""
          }`}
          onClick={() => {
            if (!uploading && (localPreviewUrl || value)) setPreviewOpen(true);
          }}
        >
          <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
            {isImage ? <BiImage size={20} /> : <BiFile size={20} />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-slate-800 truncate">
                {fileName || "File attached"}
              </p>
              {uploading && (
                <button
                  type="button"
                  className="shrink-0 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    abort();
                  }}
                  aria-label="Cancel upload"
                >
                  <BiX size={16} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <p className="text-xs text-slate-500 truncate">
                {fileSize !== null && `${formatBytes(fileSize)} · `}
                {uploading ? formatEta(etaSeconds) || "Uploading…" : "Completed"}
              </p>
              {uploading && (
                <span className="text-xs font-bold text-primary shrink-0 tabular-nums">
                  {progress}%
                </span>
              )}
            </div>
            {uploading && (
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          {!uploading && onClear && (
            <button
              type="button"
              className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              aria-label="Remove file"
            >
              <BiTrash size={18} />
            </button>
          )}
        </div>
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
