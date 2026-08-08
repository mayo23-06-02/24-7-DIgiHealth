import React from "react";

interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: "primary" | "secondary" | "accent" | "success" | "warning" | "danger";
  height?: number;
  className?: string;
  /** Render the percentage as text above the bar */
  showLabel?: boolean;
}

const colorMap = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
};

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = "primary",
  height = 8,
  className = "",
  showLabel = false,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
          <span>Progress</span>
          <span className="tabular-nums">{Math.round(clamped)}%</span>
        </div>
      )}
      <div
        className="w-full bg-slate-100 overflow-hidden rounded-full"
        style={{ height: `${height}px` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full ${colorMap[color]} transition-all duration-700 ease-out rounded-full`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
