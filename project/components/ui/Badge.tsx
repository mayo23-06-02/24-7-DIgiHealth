import React from "react";

export type BadgeStatus =
  "success" | "warning" | "error" | "info" | "neutral" | "premium";

interface BadgeProps {
  label: string;
  status?: BadgeStatus;
  variant?: "solid" | "soft" | "outline";
  className?: string;
  dot?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
  label,
  status = "neutral",
  variant = "soft",
  className = "",
  dot = false,
}) => {
  const configs: Record<BadgeStatus, { base: string; dot: string }> = {
    success: { base: "bg-primary text-white ", dot: "bg-primary" },
    warning: { base: "bg-accent text-gray-800 ", dot: "bg-accent" },
    error: {
      base: "bg-red-100 text-red-700 border-red-200",
      dot: "bg-red-500",
    },
    info: {
      base: "bg-blue-100 text-blue-700 ",
      dot: "bg-blue-500",
    },
    premium: {
      base: "bg-primary text-white ",
      dot: "bg-primary",
    },
    neutral: {
      base: "bg-slate-100 text-slate-600 ",
      dot: "bg-slate-400",
    },
  };

  const style = configs[status] || configs.neutral;

  return (
    <span
      className={`
      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-grotesk font-bold  tracking-wider
      ${style.base} ${className}
    `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-lg ${style.dot} animate-pulse`} />
      )}
      <h1> {label}</h1>
    </span>
  );
};

export default Badge;
