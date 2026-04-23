import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "accent"
    | "white"
    | "outline"
    | "dashed"
    | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
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
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center text-xs uppercase py-3 px-4 justify-center font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-full ";

  const variants = {
    primary: "bg-[#4493b8] text-white hover:bg-primary/90 ",
    secondary: "bg-secondary text-white hover:bg-secondary/90 ",
    accent: "bg-accent text-slate-900 hover:brightness-110 ",
    white: "bg-white text-primary border border-slate-200 hover:bg-slate-50",
    outline:
      "bg-transparent border border-primary text-primary hover:bg-primary/5",
    dashed:
      "bg-transparent border- border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
    danger: "bg-red-400 text-white hover:bg-red-600",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3.5 text-sm",
    lg: "px-8 py-4.5 text-lg",
    xl: "px-10 py-6 text-lg",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className} group`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === "left" && (
        <span className="px-1 transition-transform group-hover:-translate-x-1 ">
          {icon}
        </span>
      )}
      {children}
      {icon && iconPosition === "right" && (
        <span className="px-1 text-opacity-70 transition-transform group-hover:translate-x-1">
          {icon}
        </span>
      )}
    </button>
  );
};

export default Button;
