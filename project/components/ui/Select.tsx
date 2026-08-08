import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  fullWidth?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  icon?: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  fullWidth = true,
  className = "",
  id,
  icon,
  value,
  onChange,
  ...props
}) => {
  const containerStyle = fullWidth ? "w-full" : "w-auto";
  const commonStyles = `
    w-full h-11 bg-white rounded-lg outline-none appearance-none border
    focus:ring-4 focus:ring-primary/10 focus:border-primary
    transition-all text-ink-900
    ${error ? "border-danger-500 bg-danger-50" : "border-slate-200 hover:border-slate-300"}
    ${icon ? "pl-11 pr-10" : "px-4 pr-10"}
    ${className}
  `;

  return (
    <div className={`space-y-1.5 ${containerStyle}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-ink-600">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 [&>svg]:w-[18px] [&>svg]:h-[18px]">
            {icon}
          </div>
        )}

        <select
          id={id}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          className={`${commonStyles} cursor-pointer`}
          aria-invalid={!!error}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <ChevronDown size={18} />
        </div>
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

export default Select;
