import React from "react";
import Spinner from "./Spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "accent"
    | "white"
    | "outline"
    | "dashed"
    | "ghost"
    | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  loading?: boolean;
}

/**
 * Pill-shaped action button — the brand's established shape (see design.md
 * §2.4). Every variant/size below is intentionally kept backward-compatible
 * with existing call sites; only the internal styling changed.
 */
const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "right",
  fullWidth = false,
  className = "",
  disabled,
  loading = false,
  ...props
}) => {
  const baseStyles =
    "inline-flex lg:hover:scale-[1.03] items-center cursor-pointer max-w-[400px] lg:max-w-[800px] text-sm font-grotesk justify-center font-semibold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-full";

  const variants: Record<string, string> = {
    primary: "bg-primary text-white hover:bg-primary-600  shadow-primary/20",
    secondary: "bg-secondary text-white hover:bg-secondary/90",
    accent: "bg-accent text-ink-900 hover:brightness-110",
    white: "bg-white text-primary border border-slate-200 hover:bg-slate-50",
    outline: "bg-transparent border border-primary text-primary hover:bg-primary/5",
    dashed:
      "bg-transparent border border-dashed border-slate-300 text-slate-500 hover:border-primary hover:text-primary",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    danger: "bg-danger-500 text-white hover:bg-danger-700  shadow-danger-500/20",
  };

  const sizes = {
    sm: "px-4 py-2.5 text-xs min-h-[36px]",
    md: "px-6 py-3 text-sm min-h-[44px]",
    lg: "px-8 py-4 text-base min-h-[52px]",
    xl: "px-10 py-5 text-base min-h-[56px]",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} relative ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${widthStyle} ${
        // `disabled:opacity-50` in baseStyles is a class+pseudo-class selector and
        // would otherwise wash the spinner out to 50%.
        loading ? "disabled:opacity-100 cursor-wait pointer-events-none" : ""
      } ${className} group`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* Overlaid so the button keeps its exact width while pending. */}
      {loading && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
        >
          <Spinner size={18} />
        </span>
      )}
      <span
        className="inline-flex items-center justify-center gap-2 transition-opacity duration-150"
        style={{ opacity: loading ? 0 : 1 }}
      >
        {icon && iconPosition === "left" && (
          <span className="inline-flex shrink-0 [&>svg]:w-[1em] [&>svg]:h-[1em]">{icon}</span>
        )}
        <span className={`tracking-wide ${icon ? "hidden sm:inline" : "inline"}`}>
          {children}
        </span>
        {icon && iconPosition === "right" && (
          <span className="inline-flex shrink-0 [&>svg]:w-[1em] [&>svg]:h-[1em]">{icon}</span>
        )}
      </span>
    </button>
  );
};

export default Button;
