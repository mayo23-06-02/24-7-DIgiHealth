"use client";

import React, { useEffect, useState } from "react";
import { BiDownload, BiFile, BiLoaderAlt } from "react-icons/bi";
import { isLegacyMediaUrl, isMediaProxyPath } from "@/lib/supabase/media-validation";

interface MediaPreviewProps {
  url?: string | null;
  mediaId?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  className?: string;
  /** Prefer direct download link styling */
  compact?: boolean;
}

/**
 * Renders image / audio / video / file chip.
 * Resolves /api/media/file/:id proxy and mediaId to a usable URL when needed.
 */
export default function MediaPreview({
  url,
  mediaId,
  mimeType,
  fileName,
  className = "",
  compact = false,
}: MediaPreviewProps) {
  const [resolved, setResolved] = useState<string | null>(url || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (url && (isLegacyMediaUrl(url) || url.startsWith("http"))) {
        setResolved(url);
        return;
      }
      if (url && isMediaProxyPath(url)) {
        // Keep proxy path — browser can open it when authenticated
        setResolved(url);
        return;
      }
      if (mediaId) {
        setLoading(true);
        try {
          const res = await fetch(`/api/media/${mediaId}/url`);
          const json = await res.json().catch(() => ({}));
          if (!cancelled && res.ok && json.url) setResolved(json.url);
          else if (!cancelled) setResolved(`/api/media/file/${mediaId}`);
        } catch {
          if (!cancelled) setResolved(`/api/media/file/${mediaId}`);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }
      setResolved(url || null);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [url, mediaId]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-slate-500 ${className}`}>
        <BiLoaderAlt className="animate-spin" /> Loading…
      </div>
    );
  }

  if (!resolved) {
    return (
      <p className={`text-xs text-slate-400 ${className}`}>No attachment</p>
    );
  }

  const mime = (mimeType || "").toLowerCase();
  const isImage =
    mime.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp)$/i.test(resolved) ||
    /\.(jpe?g|png|gif|webp)$/i.test(fileName || "");
  const isAudio =
    mime.startsWith("audio/") || /\.(mp3|wav|ogg|webm|m4a)$/i.test(fileName || "");
  const isVideo =
    mime.startsWith("video/") || /\.(mp4|webm)$/i.test(fileName || "");

  if (isImage && !compact) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={fileName || "attachment"}
        className={`rounded-xl max-w-full h-auto ${className}`}
      />
    );
  }

  if (isAudio && !compact) {
    return <audio controls src={resolved} className={`w-full max-w-xs ${className}`} />;
  }

  if (isVideo && !compact) {
    return (
      <video
        controls
        src={resolved}
        className={`rounded-xl max-w-full ${className}`}
      />
    );
  }

  return (
    <a
      href={resolved}
      target="_blank"
      rel="noreferrer"
      download={fileName || undefined}
      className={`inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline ${className}`}
    >
      <BiFile size={16} />
      <span className="truncate max-w-[200px]">{fileName || "Download file"}</span>
      <BiDownload size={14} />
    </a>
  );
}
