import React from "react";

interface StatusDotProps {
  status: "online" | "offline" | "syncing" | "busy";
  label?: string;
  className?: string;
}

const config = {
  online: { color: "bg-success-500", pulse: false },
  syncing: { color: "bg-warning-500", pulse: true },
  busy: { color: "bg-danger-500", pulse: false },
  offline: { color: "bg-slate-400", pulse: false },
};

const StatusDot: React.FC<StatusDotProps> = ({ status, label, className = "" }) => {
  const { color, pulse } = config[status];
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium text-slate-600 ${className}`}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
      </span>
      {label}
    </span>
  );
};

export default StatusDot;
