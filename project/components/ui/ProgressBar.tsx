import React from "react";

interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: "primary" | "secondary" | "accent";
  height?: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = "primary",
  height = 4,
  className = "",
}) => {
  const colorMap = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    accent: "bg-accent",
  };

  return (
    <div
      className={`w-full bg-slate-200 overflow-hidden rounded-lg ${className}`}
      style={{ height: `${height}px` }}
    >
      <div
        className={`h-full ${colorMap[color]} transition-all duration-700 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
};

export default ProgressBar;
