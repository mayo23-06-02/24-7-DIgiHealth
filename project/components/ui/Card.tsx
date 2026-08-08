// components/ui/Card.tsx
import React from "react";

interface CardProps {
  children: React.ReactNode;
  variant?: "solid" | "glass" | "outline" | "gradient";
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
  id?: string;
}

/**
 * Base surface for dashboard content. `glass` is reserved for the marketing
 * site / hero sections — never over dense clinical data (see design.md §3.3).
 */
const Card = function Card({
  children,
  variant = "solid",
  className = "",
  noPadding = false,
  onClick,
  id,
}: CardProps) {
  const baseStyles = "rounded-xl transition-all duration-300 overflow-hidden w-full";

  const variants: Record<string, string> = {
    solid: "bg-white border border-slate-200 ",
    glass: "bg-white/70 backdrop-blur-xl border border-white/50",
    outline: "bg-transparent border-2 border-slate-200 hover:border-primary/30",
    gradient: "bg-linear-to-br from-white to-slate-50 border border-slate-200 ",
  };

  const interactive = onClick
    ? "cursor-pointer hover: hover:-translate-y-0.5"
    : "";

  return (
    <div
      id={id}
      className={`${baseStyles} ${variants[variant]} ${interactive} ${noPadding ? "" : "p-4 sm:p-6"} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export default Card;
