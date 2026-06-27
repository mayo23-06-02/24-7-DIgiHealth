import React, { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface InputProps extends React.InputHTMLAttributes<
  HTMLInputElement | HTMLTextAreaElement
> {
  label?: string;
  error?: string;
  isTextArea?: boolean;
  textarea?: boolean;
  rows?: number;
  fullWidth?: boolean;
  icon?: React.ReactNode; // placed on the left side
}

const Input: React.FC<InputProps> = ({
  label,
  error,
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

  // Compute padding classes
  let paddingClass = "px-6";
  if (icon) paddingClass = "pl-12 pr-6"; // icon on left
  if (isPassword) paddingClass = "px-6 pr-12"; // eye toggle on right

  const commonStyles = `
    w-full bg-slate-50 rounded-full outline-none  
    transition-all text-slate-900 placeholder-slate-500
    ${error ? "border-red-400 bg-red-50 border" : "border border-slate-200 bg-slate-50"}
    ${paddingClass}
    ${className}
  `;

  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  const handleTogglePassword = () => setShowPassword(!showPassword);

  return (
    <div className={`space-y-2 ${containerStyle}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-slate-500 font-bold text-sm tracking-wide"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {/* Left icon */}
        {icon && (
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 z-10">
            {icon}
          </div>
        )}

        {isMultiLine ? (
          <textarea
            id={id}
            rows={rows}
            className={`${commonStyles} pt-4 py-4 resize-none`}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={id}
            type={inputType}
            className={`${commonStyles} py-2.5 md:py-4`}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {/* Password toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={handleTogglePassword}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
            tabIndex={-1}
          >
            {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
