"use client";

import React, { useEffect } from "react";
import { BiCheckCircle, BiErrorCircle, BiInfoCircle, BiX } from "react-icons/bi";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <BiCheckCircle className="text-emerald-500" size={20} />,
    error: <BiErrorCircle className="text-rose-500" size={20} />,
    info: <BiInfoCircle className="text-primary" size={20} />,
  };

  const bgColors = {
    success: "bg-emerald-50 border-emerald-100",
    error: "bg-rose-50 border-rose-100",
    info: "bg-blue-50 border-blue-100",
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top duration-300">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-lg border ${bgColors[type]} backdrop-blur-md`}>
        {icons[type]}
        <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{message}</p>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-white/50 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
        >
          <BiX size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
