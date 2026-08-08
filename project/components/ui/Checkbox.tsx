"use client";

import React from "react";
import { Check } from "lucide-react";

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: React.ReactNode;
  description?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = "", id, ...props }, ref) => {
    const genId = React.useId();
    const inputId = id || genId;
    return (
      <label
        htmlFor={inputId}
        className={`inline-flex items-start gap-3 cursor-pointer select-none group ${className}`}
      >
        <span className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="peer sr-only"
            {...props}
          />
          <span className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white transition-colors peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 peer-disabled:opacity-50" />
          <Check
            size={14}
            strokeWidth={3}
            className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
          />
        </span>
        {(label || description) && (
          <span className="flex flex-col">
            {label && <span className="text-sm font-medium text-ink-900">{label}</span>}
            {description && (
              <span className="text-xs text-slate-500 mt-0.5">{description}</span>
            )}
          </span>
        )}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";

export default Checkbox;
