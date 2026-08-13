"use client";
import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "6xl";
  noPadding?: boolean;
  hideHeader?: boolean;
}

/**
 * Full-height right-side sheet (functions as the product's "Drawer" — see
 * design.md §3.6). For a small centered confirm/dialog, use `Dialog` instead.
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = "md",
  noPadding = false,
  hideHeader = false,
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = {
    sm: "lg:max-w-md",
    md: "lg:max-w-3xl",
    lg: "lg:max-w-4xl",
    xl: "lg:max-w-5xl",
    "2xl": "lg:max-w-[1400px]",
    "6xl": "lg:max-w-[1400px]",
    full: "lg:max-w-[95vw]",
  };

  return (
    <div className="fixed inset-0 z-[9999] max-h-[100dvh] h-full flex items-center justify-end">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${widths[width]} max-h-full h-full bg-white overflow-hidden animate-in slide-in-from-right fade-in duration-300 shadow-2xl flex flex-col`}
      >
        {!hideHeader && (
          <div className="flex items-center justify-between gap-4 px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-100 shrink-0">
            <h3 className="text-lg sm:text-xl font-bold text-ink-900 tracking-tight font-grotesk truncate">
              {title || "Details"}
            </h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 shrink-0 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-danger-50 hover:text-danger-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div
          className={`${noPadding ? "p-0" : "p-6 sm:p-8 lg:p-10"} flex-1 overflow-y-auto custom-scrollbar`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
