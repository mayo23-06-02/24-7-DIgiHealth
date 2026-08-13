"use client";

import { useCallback, useRef, useState } from "react";
import type { MediaAsset, MediaPurpose } from "@/lib/supabase/media-types";

export type UploadedMedia = MediaAsset & { url: string };

interface UploadOptions {
  purpose: MediaPurpose;
  conversationId?: string;
  relatedType?: string;
  relatedId?: string;
  patientId?: string;
  facilityId?: string;
  isPublic?: boolean;
  /** Registration (unauthenticated) */
  publicRegistration?: boolean;
  registrationToken?: string;
  onProgress?: (pct: number) => void;
}

export class UploadAbortedError extends Error {
  constructor() {
    super("Upload cancelled");
    this.name = "UploadAbortedError";
  }
}

async function putWithProgress(
  url: string,
  file: File,
  onProgress?: (pct: number, etaSeconds: number | null) => void,
  registerXhr?: (xhr: XMLHttpRequest) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    registerXhr?.(xhr);
    const startedAt = performance.now();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        const elapsedSec = (performance.now() - startedAt) / 1000;
        const rate = e.loaded / Math.max(elapsedSec, 0.05); // bytes/sec
        const remaining = e.total - e.loaded;
        const eta = rate > 0 ? Math.max(1, Math.round(remaining / rate)) : null;
        onProgress(pct, eta);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new UploadAbortedError());
    xhr.send(file);
  });
}

/**
 * Hybrid media upload: sign → PUT to Supabase → complete metadata.
 * Falls back to server multipart `/api/media/upload` if sign fails.
 */
export function useMediaUpload() {
  const [progress, setProgress] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const abort = useCallback(() => {
    xhrRef.current?.abort();
  }, []);

  const upload = useCallback(
    async (file: File, options: UploadOptions): Promise<UploadedMedia> => {
      setUploading(true);
      setError(null);
      setProgress(0);
      setEtaSeconds(null);
      xhrRef.current = null;

      const onProgress = (p: number, eta: number | null = null) => {
        setProgress(p);
        if (eta !== null) setEtaSeconds(eta);
        options.onProgress?.(p);
      };

      try {
        // 1) Sign
        const signEndpoint = options.publicRegistration
          ? "/api/media/sign-upload-public"
          : "/api/media/sign-upload";

        const signRes = await fetch(signEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            purpose: options.purpose,
            conversationId: options.conversationId,
            relatedType: options.relatedType,
            relatedId: options.relatedId,
            patientId: options.patientId,
            facilityId: options.facilityId,
            isPublic: options.isPublic,
            registrationToken: options.registrationToken,
          }),
        });

        const signJson = await signRes.json().catch(() => ({}));

        if (!signRes.ok) {
          // Fallback: server multipart (auth only)
          if (!options.publicRegistration) {
            return await uploadViaServer(file, options, onProgress);
          }
          throw new Error(signJson.error || "Failed to sign upload");
        }

        const signed = signJson.data;
        onProgress(5, null);

        // 2) PUT to storage
        await putWithProgress(
          signed.signedUrl,
          file,
          (p, eta) => onProgress(5 + Math.round(p * 0.85), eta),
          (xhr) => {
            xhrRef.current = xhr;
          },
        );

        // 3) Complete
        const completeEndpoint = options.publicRegistration
          ? "/api/media/complete-public"
          : "/api/media/complete";

        const completeRes = await fetch(completeEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: signed.filePath,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            fileType: signed.fileType,
            purpose: options.purpose,
            conversationId: options.conversationId,
            relatedType: options.relatedType,
            relatedId: options.relatedId,
            isPublic: options.isPublic,
            registrationToken:
              signed.registrationToken || options.registrationToken,
            userId: signed.userId,
          }),
        });

        const completeJson = await completeRes.json().catch(() => ({}));
        if (!completeRes.ok) {
          throw new Error(completeJson.error || "Failed to finalize upload");
        }

        onProgress(100, 0);
        return completeJson.data as UploadedMedia;
      } catch (e: any) {
        if (!(e instanceof UploadAbortedError)) {
          setError(e.message || "Upload failed");
        }
        throw e;
      } finally {
        setUploading(false);
        xhrRef.current = null;
      }
    },
    [],
  );

  return { upload, abort, progress, etaSeconds, uploading, error, setError };
}

async function uploadViaServer(
  file: File,
  options: UploadOptions,
  onProgress: (p: number, eta: number | null) => void,
): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", options.purpose);
  if (options.conversationId) form.append("conversationId", options.conversationId);
  if (options.relatedType) form.append("relatedType", options.relatedType);
  if (options.relatedId) form.append("relatedId", options.relatedId);
  if (options.patientId) form.append("patientId", options.patientId);
  if (options.isPublic) form.append("isPublic", "true");

  onProgress(20, null);
  const res = await fetch("/api/media/upload", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Server upload failed");
  onProgress(100, 0);
  return json.data as UploadedMedia;
}
