import React from "react";
import {
  BiTrendingUp,
  BiTrendingDown,
  BiChevronRight,
  BiLoaderAlt,
} from "react-icons/bi";
import Card from "./Card";

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
  description?: string;
  onClick?: () => void;
  /** Force-hide footer chevron even when onClick is set */
  hideChevron?: boolean;
  /** Navigation triggered by this card is in flight — swaps chevron for a spinner */
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  unit,
  icon,
  trend,
  color = "primary",
  description,
  onClick,
  hideChevron,
  loading = false,
}) => {
  const clickable = typeof onClick === "function";
  const showChevron = clickable && !hideChevron;

  return (
    <Card
      noPadding
      className={`
        flex justify-between flex-col h-full transition-transform group
        ${clickable && !loading ? "hover:scale-[1.01] sm:hover:scale-[1.02] cursor-pointer" : "cursor-default"}
        ${loading ? "opacity-70 cursor-wait pointer-events-none" : ""}
      `}
      onClick={loading ? undefined : onClick}
    >
      <div className="flex flex-col h-full">
        <div className="p-3 sm:p-4 lg:py-4 lg:px-4 flex items-start justify-between gap-2">
          <div
            className={`
          w-8 h-8 sm:h-10 sm:w-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center text-white
          transition-all duration-500 shrink-0
          ${color === "primary" ? "bg-primary" : color === "emerald" ? "bg-emerald-500" : color === "red" ? "bg-red-500" : "bg-slate-800"}
        `}
          >
            <span className="scale-75 sm:scale-90 lg:scale-100 origin-center [&>svg]:w-[18px] [&>svg]:h-[18px] sm:[&>svg]:w-5 sm:[&>svg]:h-5 lg:[&>svg]:w-6 lg:[&>svg]:h-6">
              {icon}
            </span>
          </div>

          {trend !== undefined && (
            <div
              className={`
            flex items-center gap-0.5 sm:gap-1 font-bold px-2 sm:px-2 py-1 sm:py-1 rounded-full text-[8px] sm:text-[10px] lg:text-xs
            ${trend >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}
          `}
            >
              {trend >= 0 ? <BiTrendingUp /> : <BiTrendingDown />}
              <p>{Math.abs(trend)}%</p>
            </div>
          )}
        </div>

        <div className="space-y-1 sm:space-y-1 pb-3 sm:pb-4 px-3 sm:px-4 flex-1">
          <div className="flex items-baseline gap-0.5 sm:gap-1 flex-wrap">
            <h4 className="text-xl sm:text-2xl lg:text-4xl font-medium text-slate-900 tracking-tight font-grotesk leading-none">
              {value}
            </h4>
            {unit && (
              <span className="text-xs sm:text-md lg:text-lg font-semibold text-slate-500">
                {unit}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[11px] sm:text-[13px] lg:text-sm text-slate-500 leading-tight line-clamp-2">
              {description}
            </p>
          )}
        </div>
        <div
          className={`
            py-2  lg:py-4 lg:px-6 px-3 sm:px-4 flex items-center border-t border-slate-100 transition-all duration-500
            ${showChevron ? "justify-between hover:bg-slate-50" : "justify-start"}
          `}
        >
          <p className="text-[11px] sm:text-sm font-semibold text-slate-500 truncate pr-1">
            {label}
          </p>
          {showChevron && (
            <div className="shrink-0">
              {loading ? (
                <BiLoaderAlt className="text-primary animate-spin" size={16} />
              ) : (
                <BiChevronRight className="text-slate-500" size={16} />
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default KPICard;
