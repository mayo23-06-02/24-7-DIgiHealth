"use client";

import React, { useEffect, useRef, useState } from "react";
import FileCard from "./FileCard";
import { useMediaUpload, type UploadedMedia } from "./useMediaUpload";
import type { MediaPurpose } from "@/lib/supabase/media-types";

export interface UploadSlotItemProps {
  file: File;
  purpose: MediaPurpose;
  publicRegistration?: boolean;
  registrationToken?: string;
  onRegistrationToken?: (token: string) => void;
  /** Only the head of the queue is active — others wait so concurrent
   * signed-upload requests don't trip Supabase's clock-skew check. */
  active: boolean;
  /** previewUrl is a blob: URL this component created — ownership transfers
   * to the caller on success; the caller is responsible for revoking it. */
  onDone: (asset: UploadedMedia, file: File, previewUrl: string) => void;
  onCancelOrError: () => void;
}

export default function UploadSlotItem({
  file,
  purpose,
  publicRegistration,
  registrationToken,
  onRegistrationToken,
  active,
  onDone,
  onCancelOrError,
}: UploadSlotItemProps) {
  const { upload, abort, progress, etaSeconds, uploading, error } = useMediaUpload();
  const [previewUrl] = useState(() => URL.createObjectURL(file));
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;
    upload(file, { purpose, publicRegistration, registrationToken })
      .then((asset) => {
        if ((asset as any).registrationToken && onRegistrationToken) {
          onRegistrationToken((asset as any).registrationToken);
        }
        doneRef.current = true;
        onDone(asset, file, previewUrl);
      })
      .catch(() => {
        onCancelOrError();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Only revoke here if we never handed the blob off to the parent
  // (cancelled or errored) — on success the parent now owns it.
  useEffect(() => {
    return () => {
      if (!doneRef.current) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-1">
      <FileCard
        fileName={file.name}
        fileSize={file.size}
        mimeType={file.type}
        uploading={active && uploading}
        queued={!active}
        progress={progress}
        etaSeconds={etaSeconds}
        previewUrl={previewUrl}
        onCancel={active ? abort : onCancelOrError}
      />
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
