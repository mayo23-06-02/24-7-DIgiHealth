import React from "react";

export type BadgeStatus =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "premium";

interface BadgeProps {
  label: string;
  status?: BadgeStatus;
  variant?: "solid" | "soft" | "outline";
  size?: "sm" | "md";
  className?: string;
  dot?: boolean;
}

/**
 * The single source of truth for status color across the product — every
 * screen should reach for this instead of hand-picking bg-emerald-100 vs
 * bg-rose-100 vs bg-red-100 per file (see design.md §0, §3.4).
 */
const Badge: React.FC<BadgeProps> = ({
  label,
  status = "neutral",
  variant = "soft",
  size = "md",
  className = "",
  dot = false,
}) => {
  const configs: Record<
    BadgeStatus,
    { soft: string; solid: string; outline: string; dot: string }
  > = {
    success: {
      soft: "bg-success-50 text-success-700",
      solid: "bg-success-500 text-white",
      outline: "bg-transparent border border-success-500 text-success-700",
      dot: "bg-success-500",
    },
    warning: {
      soft: "bg-warning-50 text-warning-700",
      solid: "bg-warning-500 text-white",
      outline: "bg-transparent border border-warning-500 text-warning-700",
      dot: "bg-warning-500",
    },
    error: {
      soft: "bg-danger-50 text-danger-700",
      solid: "bg-danger-500 text-white",
      outline: "bg-transparent border border-danger-500 text-danger-700",
      dot: "bg-danger-500",
    },
    info: {
      soft: "bg-info-50 text-info-700",
      solid: "bg-info-500 text-white",
      outline: "bg-transparent border border-info-500 text-info-700",
      dot: "bg-info-500",
    },
    premium: {
      soft: "bg-accent/20 text-amber-700",
      solid: "bg-accent text-ink-900",
      outline: "bg-transparent border border-accent text-amber-700",
      dot: "bg-accent",
    },
    neutral: {
      soft: "bg-slate-100 text-slate-600",
      solid: "bg-slate-600 text-white",
      outline: "bg-transparent border border-slate-300 text-slate-600",
      dot: "bg-slate-400",
    },
  };

  const style = configs[status] || configs.neutral;
  const colorClass = style[variant] || style.soft;
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide font-grotesk whitespace-nowrap ${sizeClass} ${colorClass} ${className}`}
    >
      {dot && <span className={`uppercase w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />}
      {label}
    </span>
  );
};

export default Badge;
