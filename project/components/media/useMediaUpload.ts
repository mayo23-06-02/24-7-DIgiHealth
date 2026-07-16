"use client";

import { useCallback, useState } from "react";
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

async function putWithProgress(
  url: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

/**
 * Hybrid media upload: sign → PUT to Supabase → complete metadata.
 * Falls back to server multipart `/api/media/upload` if sign fails.
 */
export function useMediaUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, options: UploadOptions): Promise<UploadedMedia> => {
      setUploading(true);
      setError(null);
      setProgress(0);

      const onProgress = (p: number) => {
        setProgress(p);
        options.onProgress?.(p);
      };

      try {
        // 1) Sign
        const signEndpoint = options.publicRegistration
          ? "/api/media/sign-upload-public"
          : "/api/media/sign-upload";

        console.log("[useMediaUpload] Attempting sign upload for:", file.name);
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
        console.log("[useMediaUpload] Sign response status:", signRes.status, "data:", signJson);

        if (!signRes.ok) {
          console.log("[useMediaUpload] Sign upload failed, falling back to server upload");
          // Fallback: server multipart (auth only)
          if (!options.publicRegistration) {
            return await uploadViaServer(file, options, onProgress);
          }
          throw new Error(signJson.error || "Failed to sign upload");
        }

        const signed = signJson.data;
        onProgress(5);

        // 2) PUT to storage
        await putWithProgress(signed.signedUrl, file, (p) =>
          onProgress(5 + Math.round(p * 0.85)),
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

        onProgress(100);
        return completeJson.data as UploadedMedia;
      } catch (e: any) {
        setError(e.message || "Upload failed");
        throw e;
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  return { upload, progress, uploading, error, setError };
}

async function uploadViaServer(
  file: File,
  options: UploadOptions,
  onProgress: (p: number) => void,
): Promise<UploadedMedia> {
  console.log("[uploadViaServer] Starting server upload for:", file.name, "size:", file.size, "type:", file.type);
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", options.purpose);
  if (options.conversationId) form.append("conversationId", options.conversationId);
  if (options.relatedType) form.append("relatedType", options.relatedType);
  if (options.relatedId) form.append("relatedId", options.relatedId);
  if (options.patientId) form.append("patientId", options.patientId);
  if (options.isPublic) form.append("isPublic", "true");

  onProgress(20);
  const res = await fetch("/api/media/upload", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  console.log("[uploadViaServer] Response status:", res.status, "data:", json);
  if (!res.ok) throw new Error(json.error || "Server upload failed");
  onProgress(100);
  return json.data as UploadedMedia;
}
