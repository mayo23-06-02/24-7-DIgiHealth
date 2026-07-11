"use client";
import React, { useEffect } from "react";
import { BiX } from "react-icons/bi";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "6xl";
  noPadding?: boolean;
  hideHeader?: boolean;
}

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

  if (!isOpen) return null;

  const widths = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-5xl",
    "2xl": "max-w-6xl",
    "6xl": "max-w-6xl",
    full: "max-w-[95vw]",
  };

  return (
    <div className="fixed inset-0 z-[9999] max-h-[100vh] h-full flex items-center justify-end ">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={`
        relative lg:max-w-3xl w-full max-h-full h-full bg-white rounded-lg overflow-hidden
        animate-in zoom-in-95 fade-in duration-500 transition-all shadow-none
      `}
      >
        {/* Header */}
        {!hideHeader && (
          <div className="flex max-w-3xl items-center justify-between px-10 py-8 border-b border-slate-50">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight  font-grotesk">
              {title ? (
                <>
                  {title.split(" ").slice(0, -1).join(" ")}{" "}
                  <span className="text-primary">
                    {title.split(" ").slice(-1)}
                  </span>
                </>
              ) : (
                "Action Detail"
              )}
            </h3>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <BiX size={24} />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div
          className={`
            ${noPadding ? "p-0" : "p-10"} 
            max-h-[90vh] max-w-3xl overflow-y-auto custom-scrollbar
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
