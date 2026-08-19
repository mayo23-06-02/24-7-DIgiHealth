"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import Button from "./Button";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** Renders a footer with Cancel + confirm action */
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  confirmLoading?: boolean;
}

const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

/**
 * Centered dialog — confirmations, small single-purpose forms. For anything
 * content-heavy (booking, profile detail, chat) use `Modal` instead.
 * Becomes a bottom sheet below `sm:` per design.md §3.6.
 */
const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "sm",
  onConfirm,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  confirmLoading = false,
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${sizes[size]} bg-white shadow-2xl overflow-hidden
          rounded-t-2xl sm:rounded-2xl
          animate-in slide-in-from-bottom sm:zoom-in-95 sm:slide-in-from-bottom-0 fade-in duration-200`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            {title && (
              <h3 className="text-h4 font-bold text-ink-900 font-grotesk">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {children && <div className="px-6 py-4">{children}</div>}

        {onConfirm && (
          <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant={confirmVariant}
              size="sm"
              onClick={onConfirm}
              loading={confirmLoading}
            >
              {confirmLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dialog;
