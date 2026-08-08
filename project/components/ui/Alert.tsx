"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { BadgeStatus } from "./Badge";

interface AlertProps {
  status?: Exclude<BadgeStatus, "premium" | "neutral">;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const config = {
  success: {
    icon: CheckCircle2,
    classes: "bg-success-50 border-success-500/20 text-success-700",
    iconClass: "text-success-500",
  },
  warning: {
    icon: AlertTriangle,
    classes: "bg-warning-50 border-warning-500/20 text-warning-700",
    iconClass: "text-warning-500",
  },
  error: {
    icon: AlertCircle,
    classes: "bg-danger-50 border-danger-500/20 text-danger-700",
    iconClass: "text-danger-500",
  },
  info: {
    icon: Info,
    classes: "bg-info-50 border-info-500/20 text-info-700",
    iconClass: "text-info-500",
  },
};

/** Persistent, contextual page message — for transient confirmations use Toast instead. */
const Alert: React.FC<AlertProps> = ({
  status = "info",
  title,
  children,
  action,
  onDismiss,
  className = "",
}) => {
  const { icon: Icon, classes, iconClass } = config[status];
  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-xl border px-4 py-3.5 ${classes} ${className}`}
    >
      <Icon size={20} className={`shrink-0 mt-0.5 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {children && <div className="text-sm mt-0.5 opacity-90">{children}</div>}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 h-fit p-1 rounded-lg hover:bg-black/5 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
