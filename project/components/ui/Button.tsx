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
    "inline-flex items-center justify-center cursor-pointer max-w-[400px] text-sm font-grotesk uppercase  py-4 px-4 font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-full ";

  const variants = {
    primary: "bg-[#2b617a] text-white hover:bg-primary/90 ",
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
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4.5 text-lg",
    xl: "px-10 py-6 text-lg",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variants[variant as keyof typeof variants] || variants.primary} ${sizes[size as keyof typeof sizes] || sizes.md} ${widthStyle} ${className} group`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
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
      )}
      {icon && iconPosition === "left" && (
        <span className="px-4 transition-transform group-hover:-translate-x-1 ">
          {icon}
        </span>
      )}
      <h4 className="text-md text-center  tracking-wide flex gap-2 items-center">
        {children}
      </h4>
      {icon && iconPosition === "right" && (
        <span className="px-4 text-opacity-70 transition-transform group-hover:translate-x-1">
          {icon}
        </span>
      )}
    </button>
  );
};

export default Button;
