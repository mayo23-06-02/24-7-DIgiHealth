"use client";

import React, { useEffect, useRef, useState } from "react";
import { BiRefresh } from "react-icons/bi";
import FileCard from "./FileCard";
import { useMediaUpload, UploadAbortedError, type UploadedMedia } from "./useMediaUpload";
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
  /** User explicitly cancelled — remove this item, nothing to explain. */
  onCancelled: () => void;
}

export default function UploadSlotItem({
  file,
  purpose,
  publicRegistration,
  registrationToken,
  onRegistrationToken,
  active,
  onDone,
  onCancelled,
}: UploadSlotItemProps) {
  const { upload, abort, progress, etaSeconds, uploading, error, setError } =
    useMediaUpload();
  const [previewUrl] = useState(() => URL.createObjectURL(file));
  const startedRef = useRef(false);
  const doneRef = useRef(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!active || (startedRef.current && attempt === 0)) return;
    startedRef.current = true;
    upload(file, { purpose, publicRegistration, registrationToken })
      .then((asset) => {
        if ((asset as any).registrationToken && onRegistrationToken) {
          onRegistrationToken((asset as any).registrationToken);
        }
        doneRef.current = true;
        onDone(asset, file, previewUrl);
      })
      .catch((e: any) => {
        if (e instanceof UploadAbortedError) onCancelled();
        // Otherwise: leave the card mounted showing the error + Retry.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, attempt]);

  // Only revoke here if we never handed the blob off to the parent
  // (cancelled or errored) — on success the parent now owns it. Also abort
  // any in-flight upload so navigating away mid-upload (e.g. clicking Back)
  // doesn't leave an orphaned request running against a now-unmounted item.
  useEffect(() => {
    return () => {
      if (!doneRef.current) {
        abort();
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = () => {
    setError(null);
    setAttempt((n) => n + 1);
  };

  return (
    <div className="space-y-1.5">
      <FileCard
        fileName={file.name}
        fileSize={file.size}
        mimeType={file.type}
        uploading={active && uploading}
        queued={!active}
        progress={progress}
        etaSeconds={etaSeconds}
        previewUrl={previewUrl}
        onCancel={active ? abort : onCancelled}
      />
      {error && (
        <div className="flex items-center justify-between gap-3 pl-1">
          <p className="text-xs text-red-600 font-medium">{error}</p>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={retry}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <BiRefresh size={14} /> Retry
            </button>
            <button
              type="button"
              onClick={onCancelled}
              className="text-xs font-semibold text-slate-500 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
