import React from "react";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import Spinner from "./Spinner";
import Card from "./Card";

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: number;
  /** true = up is good (default). Set false for metrics like cost/ha where down is good. */
  trendUp?: boolean;
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
  trendUp = true,
  color = "primary",
  description,
  onClick,
  hideChevron,
  loading = false,
}) => {
  const clickable = typeof onClick === "function";
  const showChevron = clickable && !hideChevron;

  const iconBg: Record<string, string> = {
    primary: "bg-primary",
    emerald: "bg-success-500",
    red: "bg-danger-500",
    amber: "bg-warning-500",
    slate: "bg-slate-800",
  };

  const trendIsGood = trendUp ? (trend ?? 0) >= 0 : (trend ?? 0) < 0;

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
              w-8 h-8 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center text-white
              transition-all duration-500 shrink-0 ${iconBg[color] || iconBg.primary}
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
                ${trendIsGood ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}
              `}
            >
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-1 pb-3 sm:pb-4 px-3 sm:px-4 flex-1">
          <div className="flex items-baseline gap-0.5 sm:gap-1 flex-wrap">
            <h4 className="text-3xl lg:text-4xl font-medium text-ink-900 tracking-tight font-grotesk leading-none tabular-nums">
              {value}
            </h4>
            {unit && (
              <span className="text-md lg:text-lg font-semibold text-slate-500">
                {unit}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm lg:text-sm text-slate-500 leading-tight line-clamp-2">
              {description}
            </p>
          )}
        </div>
        <div
          className={`
            py-2 lg:py-4 lg:px-6 px-3 sm:px-4 flex items-center border-t border-slate-100 transition-all duration-500
            ${showChevron ? "justify-between group-hover:bg-slate-50" : "justify-start"}
          `}
        >
          <p className="text-xs sm:text-sm font-semibold text-slate-500 truncate pr-1">
            {label}
          </p>
          {showChevron && (
            <div className="shrink-0">
              {loading ? (
                <Spinner size={16} className="text-primary" />
              ) : (
                <ChevronRight className="text-slate-400" size={16} />
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default KPICard;
