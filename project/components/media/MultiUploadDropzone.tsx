"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BiCloudUpload } from "react-icons/bi";
import FileCard from "./FileCard";
import MediaPreviewModal from "./MediaPreviewModal";
import UploadSlotItem from "./UploadSlotItem";
import type { MediaPurpose } from "@/lib/supabase/media-types";

export interface MultiUploadDropzoneProps {
  purpose: MediaPurpose;
  label?: string;
  description?: string;
  accept?: string;
  maxFiles?: number;
  publicRegistration?: boolean;
  registrationToken?: string;
  onRegistrationToken?: (token: string) => void;
  /** Confirmed, uploaded file URLs (lifted to parent form state). */
  values: string[];
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
  className?: string;
}

interface PendingItem {
  id: string;
  file: File;
}

interface CompletedMeta {
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** blob: URL owned by this component — revoked on remove/unmount. */
  previewUrl: string;
}

export default function MultiUploadDropzone({
  purpose,
  label,
  description,
  accept = "image/*,.pdf,application/pdf",
  maxFiles = 3,
  publicRegistration,
  registrationToken,
  onRegistrationToken,
  values,
  onAdd,
  onRemove,
  className = "",
}: MultiUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [metaByUrl, setMetaByUrl] = useState<Record<string, CompletedMeta>>({});
  const [previewTarget, setPreviewTarget] = useState<{
    url: string;
    mimeType?: string;
    fileName?: string;
  } | null>(null);
  const metaByUrlRef = useRef(metaByUrl);
  metaByUrlRef.current = metaByUrl;

  // Revoke every blob this component still owns when it unmounts.
  useEffect(() => {
    return () => {
      Object.values(metaByUrlRef.current).forEach((m) => URL.revokeObjectURL(m.previewUrl));
    };
  }, []);

  const slotsUsed = values.length + pending.length;
  const canAddMore = slotsUsed < maxFiles;

  const addFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files) return;
      const room = maxFiles - slotsUsed;
      if (room <= 0) return;
      const toAdd = Array.from(files).slice(0, room);
      setPending((prev) => [
        ...prev,
        ...toAdd.map((file) => ({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
        })),
      ]);
    },
    [maxFiles, slotsUsed],
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <p className="text-sm font-bold text-slate-600 tracking-wide">{label}</p>}
      {description && <p className="text-xs text-slate-500 -mt-1 mb-1">{description}</p>}

      <div className="space-y-2">
        {values.map((url) => {
          const meta = metaByUrl[url];
          return (
            <FileCard
              key={url}
              fileName={meta?.fileName || "Document"}
              fileSize={meta?.fileSize ?? null}
              mimeType={meta?.mimeType}
              previewUrl={meta?.previewUrl || url}
              onView={() =>
                setPreviewTarget({
                  url: meta?.previewUrl || url,
                  mimeType: meta?.mimeType,
                  fileName: meta?.fileName,
                })
              }
              onRemove={() => {
                onRemove(url);
                setMetaByUrl((prev) => {
                  if (prev[url]) URL.revokeObjectURL(prev[url].previewUrl);
                  const next = { ...prev };
                  delete next[url];
                  return next;
                });
              }}
            />
          );
        })}

        {pending.map((item, index) => (
          <UploadSlotItem
            key={item.id}
            file={item.file}
            purpose={purpose}
            publicRegistration={publicRegistration}
            registrationToken={registrationToken}
            onRegistrationToken={onRegistrationToken}
            active={index === 0}
            onDone={(asset, file, previewUrl) => {
              setMetaByUrl((prev) => ({
                ...prev,
                [asset.url]: {
                  fileName: file.name,
                  fileSize: file.size,
                  mimeType: file.type,
                  previewUrl,
                },
              }));
              onAdd(asset.url);
              setPending((prev) => prev.filter((p) => p.id !== item.id));
            }}
            onCancelOrError={() => {
              setPending((prev) => prev.filter((p) => p.id !== item.id));
            }}
          />
        ))}
      </div>

      {canAddMore && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className="relative border border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors border-slate-200 hover:border-primary/50 hover:bg-slate-50"
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 text-primary flex items-center justify-center">
            <BiCloudUpload size={26} />
          </div>
          <p className="text-sm font-bold text-slate-600">
            Click or drag & drop to upload
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {slotsUsed}/{maxFiles} uploaded — Images or PDF
          </p>
        </div>
      )}

      {previewTarget && (
        <MediaPreviewModal
          url={previewTarget.url}
          mimeType={previewTarget.mimeType}
          fileName={previewTarget.fileName}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </div>
  );
}
