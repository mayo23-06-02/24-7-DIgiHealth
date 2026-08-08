"use client";

import React from "react";

interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: React.ReactNode;
  description?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, className = "", id, ...props }, ref) => {
    const genId = React.useId();
    const inputId = id || genId;
    return (
      <label
        htmlFor={inputId}
        className={`inline-flex items-start gap-3 cursor-pointer select-none ${className}`}
      >
        <span className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="radio"
            className="peer sr-only"
            {...props}
          />
          <span className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white transition-colors peer-checked:border-primary peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 peer-disabled:opacity-50" />
          <span className="absolute w-2.5 h-2.5 rounded-full bg-primary scale-0 peer-checked:scale-100 transition-transform" />
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
Radio.displayName = "Radio";

/** Convenience wrapper for a set of mutually-exclusive radios sharing a `name`. */
export const RadioGroup: React.FC<{
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; description?: string }[];
  className?: string;
  direction?: "row" | "col";
}> = ({ name, value, onChange, options, className = "", direction = "col" }) => (
  <div className={`flex ${direction === "row" ? "flex-row gap-6" : "flex-col gap-3"} ${className}`}>
    {options.map((opt) => (
      <Radio
        key={opt.value}
        name={name}
        value={opt.value}
        checked={value === opt.value}
        onChange={() => onChange(opt.value)}
        label={opt.label}
        description={opt.description}
      />
    ))}
  </div>
);

export default Radio;
