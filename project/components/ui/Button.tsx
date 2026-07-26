import React from "react";

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
    "inline-flex lg:hover:scale-105 items-center flex cursor-pointer max-w-[400px] lg:max-w-[800px] text-sm font-grotesk uppercase   justify-center font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-full ";

  const variants = {
    primary: "bg-primary text-white hover:bg-[#326E8A] ",
    secondary: "bg-secondary text-white hover:bg-secondary/90 ",
    accent: "bg-accent text-slate-900 hover:brightness-110 ",
    white: "bg-white text-primary border border-slate-200 hover:bg-slate-50",
    outline:
      "bg-transparent border border-primary text-primary hover:bg-primary/5",
    dashed:
      "bg-transparent border- border-dashed border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
    danger: "bg-red-400 text-white hover:bg-red-600",
  };

  const sizes = {
    sm: "px-3 py-2 text-[10px]",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4.5 text-lg",
    xl: "px-10 py-6 text-lg",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} relative ${variants[variant as keyof typeof variants] || variants.primary} ${sizes[size as keyof typeof sizes] || sizes.md} ${widthStyle} ${
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
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            className="animate-spin h-5 w-5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </span>
      )}
      <span
        className="inline-flex items-center justify-center transition-opacity duration-150"
        style={{ opacity: loading ? 0 : 1 }}
      >
        {icon && iconPosition === "left" && (
          <span className="px-2  ">{icon}</span>
        )}
        <h4
          className={`text-md text-center tracking-wide flex gap-2 items-center ${icon ? "hidden sm:flex" : "flex"}`}
        >
          {children}
        </h4>
        {icon && iconPosition === "right" && (
          <span className="px-2 ">{icon}</span>
        )}
      </span>
    </button>
  );
};

export default Button;
