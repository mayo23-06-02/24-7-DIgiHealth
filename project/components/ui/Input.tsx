import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isTextArea?: boolean;
  textarea?: boolean;
  rows?: number;
  fullWidth?: boolean;
  icon?: React.ReactNode; // placed on the left side
}

/**
 * Single form-field contract for the whole product (see design.md §3.2):
 * rounded-lg bordered field, visible label, one error style. Every hand-rolled
 * `<input className="border ...">` elsewhere should migrate to this.
 */
const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  isTextArea = false,
  textarea = false,
  rows = 3,
  fullWidth = true,
  className = "",
  id,
  icon,
  type,
  ...props
}) => {
  const isMultiLine = isTextArea || textarea;
  const isPassword = type === "password" && !isMultiLine;

  const [showPassword, setShowPassword] = useState(false);

  const containerStyle = fullWidth ? "w-full" : "w-auto";

  let paddingClass = "px-4";
  if (icon) paddingClass = "pl-11 pr-4";
  if (isPassword) paddingClass = "px-4 pr-11";

  const commonStyles = `
    w-full bg-white rounded-lg outline-none border
    transition-all text-ink-900 placeholder-slate-400
    focus:ring-4 focus:ring-primary/10 focus:border-primary
    ${error ? "border-danger-500 bg-danger-50" : "border-slate-200 hover:border-slate-300"}
    ${paddingClass}
    ${className}
  `;

  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={`space-y-1.5 ${containerStyle}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-ink-600 font-semibold text-sm tracking-wide"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 [&>svg]:w-[18px] [&>svg]:h-[18px]">
            {icon}
          </div>
        )}

        {isMultiLine ? (
          <textarea
            id={id}
            rows={rows}
            className={`${commonStyles} py-3 resize-none`}
            aria-invalid={!!error}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={id}
            type={inputType}
            className={`${commonStyles} h-11`}
            aria-invalid={!!error}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-xs font-medium text-danger-700">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Input;
