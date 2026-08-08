"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

/**
 * Standalone, manually-mounted toast. For most of the app, prefer the
 * `react-hot-toast` instance already mounted in app/layout.tsx (`toast.success(...)`),
 * whose default styling is themed to match this component's colors.
 */
const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="text-success-500" size={20} />,
    error: <AlertCircle className="text-danger-500" size={20} />,
    info: <Info className="text-info-500" size={20} />,
  };

  const bgColors = {
    success: "bg-success-50 border-success-500/20",
    error: "bg-danger-50 border-danger-500/20",
    info: "bg-info-50 border-info-500/20",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top duration-300"
    >
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border  ${bgColors[type]} backdrop-blur-md`}
      >
        {icons[type]}
        <p className="text-sm font-semibold text-ink-900 whitespace-nowrap">
          {message}
        </p>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="ml-2 p-1 hover:bg-white/60 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
