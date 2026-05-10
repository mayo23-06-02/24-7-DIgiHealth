import React from "react";
import { BiChevronDown } from "react-icons/bi";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange"
> {
  label?: string;
  error?: string;
  options: SelectOption[];
  fullWidth?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  icon?: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
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
    w-full bg-slate-50 rounded-2xl outline-none appearance-none
    focus:ring-4 focus:ring-primary/10 focus:border-primary 
    transition-all text-slate-900 placeholder-slate-400 border border-slate-300
    ${error ? "border-red-400 bg-red-50 text-red-900" : ""}
    ${icon ? "pl-14 pr-12" : "px-6 pr-12"}
    ${className}
  `;

  return (
    <div className={`space-y-2 ${containerStyle}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-slate-500 ">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 z-10">
            {icon}
          </div>
        )}

        <select
          id={id}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          className={`${commonStyles} py-4 cursor-pointer`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          <BiChevronDown size={24} />
        </div>
      </div>

      {error && (
        <p className="mt-1.5 text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;
