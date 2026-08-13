"use client";

import React from "react";
import { BiFile, BiImage, BiTrash, BiX } from "react-icons/bi";

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatEta(seconds: number | null): string | null {
  if (seconds === null) return null;
  if (seconds < 60) return `${seconds} sec left`;
  const mins = Math.ceil(seconds / 60);
  return `${mins} min left`;
}

export interface FileCardProps {
  fileName: string;
  fileSize?: number | null;
  mimeType?: string | null;
  uploading?: boolean;
  /** Selected but waiting for an earlier upload in the queue to finish. */
  queued?: boolean;
  progress?: number;
  etaSeconds?: number | null;
  /** Present once the file has a URL to preview (local blob or remote). */
  previewUrl?: string | null;
  onView?: () => void;
  onCancel?: () => void;
  onRemove?: () => void;
  className?: string;
}

export default function FileCard({
  fileName,
  fileSize = null,
  mimeType,
  uploading = false,
  queued = false,
  progress = 0,
  etaSeconds = null,
  previewUrl,
  onView,
  onCancel,
  onRemove,
  className = "",
}: FileCardProps) {
  const isImage = mimeType?.startsWith("image/");
  const canView = !uploading && !!previewUrl && !!onView;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs ${
        canView ? "cursor-pointer hover:border-primary/40" : ""
      } ${className}`}
      onClick={() => canView && onView?.()}
    >
      <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
        {isImage ? <BiImage size={20} /> : <BiFile size={20} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-slate-800 truncate">{fileName}</p>
          {(uploading || queued) && onCancel && (
            <button
              type="button"
              className="shrink-0 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
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
            {queued
              ? "Queued…"
              : uploading
                ? formatEta(etaSeconds) || "Uploading…"
                : "Completed"}
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

      {!uploading && onRemove && (
        <button
          type="button"
          className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove file"
        >
          <BiTrash size={18} />
        </button>
      )}
    </div>
  );
}
