import React from "react";

interface InputProps extends React.InputHTMLAttributes<
  HTMLInputElement | HTMLTextAreaElement
> {
  label?: string;
  error?: string;
  /** Use isTextArea OR textarea (alias) to render a <textarea> */
  isTextArea?: boolean;
  /** Alias for isTextArea — prevents the `textarea` prop leaking to DOM */
  textarea?: boolean;
  rows?: number;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  isTextArea = false,
  textarea = false, // ← accept & destructure so it never reaches the DOM
  rows = 3,
  fullWidth = true,
  className = "",
  id,
  icon,
  ...props
}) => {
  const isMultiLine = isTextArea || textarea;

  const containerStyle = fullWidth ? "w-full" : "w-auto";
  const commonStyles = `
    w-full bg-slate-50 rounded-2xl outline-none 
    focus:ring-4 focus:ring-primary/10 focus:border-primary 
    transition-all text-slate-900  placeholder-slate-500
    ${error ? "border-red-400 bg-red-50 border" : "border border-slate-300 bg-slate-50"}
    ${icon ? "pl-14 pr-6" : "px-6"}
    ${className}
  `;

  return (
    <div className={`space-y-2 ${containerStyle}`}>
      {label && (
        <label htmlFor={id} className="block text-slate-500 ">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 z-10">
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
            className={`${commonStyles} py-4`}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs  text-red-500 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
