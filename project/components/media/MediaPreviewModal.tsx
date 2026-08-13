"use client";

import React, { useEffect, useState } from "react";
import { BiX, BiLinkExternal } from "react-icons/bi";

export interface MediaPreviewModalProps {
  url: string;
  mimeType?: string | null;
  fileName?: string | null;
  onClose: () => void;
}

function guessKind(url: string, mimeType?: string | null): "image" | "pdf" | "other" {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  const path = url.split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/.test(path)) return "image";
  if (path.endsWith(".pdf")) return "pdf";
  return "other";
}

export default function MediaPreviewModal({
  url,
  mimeType,
  fileName,
  onClose,
}: MediaPreviewModalProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const kind = guessKind(url, mimeType);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-100 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <p className="text-sm font-bold text-slate-700 truncate pr-4">
            {fileName || "Preview"}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              title="Open in new tab"
            >
              <BiLinkExternal size={18} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              title="Close"
              autoFocus
            >
              <BiX size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center min-h-[240px]">
          {kind === "image" && !imgFailed ? (
            <img
              src={url}
              alt={fileName || "Preview"}
              className="max-w-full max-h-[70vh] object-contain"
              onError={() => setImgFailed(true)}
            />
          ) : kind === "pdf" ? (
            <iframe src={url} title={fileName || "Preview"} className="w-full h-[70vh]" />
          ) : (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-500 mb-3">
                No inline preview available for this file type.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Open in a new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
