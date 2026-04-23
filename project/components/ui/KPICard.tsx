import React from "react";
import { BiTrendingUp, BiTrendingDown, BiChevronRight } from "react-icons/bi";
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
}) => {
  return (
    <Card
      noPadding
      className="hover:scale-[1.02] cursor-pointer transition-transform  group"
      onClick={onClick}
    >
      <div className="py-4 px-6  flex items-start justify-between ">
        <div
          className={`
          w-12 h-12 rounded-lg  flex items-center justify-center text-white 
          transition-all duration-500 
          ${color === "primary" ? "bg-primary" : color === "emerald" ? "bg-emerald-500" : "bg-slate-800"}
        `}
        >
          {icon}
        </div>

        {trend !== undefined && (
          <div
            className={`
            flex items-center gap-1 px-2 py-1 rounded-full text-sm 
            ${trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}
          `}
          >
            {trend >= 0 ? <BiTrendingUp /> : <BiTrendingDown />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="space-y-1 py-4 px-6">
        <div className="flex items-baseline gap-1">
          <h4 className="text-4xl font-medium text-slate-900 tracking-tight">
            {value}
          </h4>
          {unit && (
            <span className="text-lg font-semibold text-slate-300">{unit}</span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-400  leading-tight">{description}</p>
        )}
      </div>
      <div className="py-4 px-6 flex items-center justify-between border-t hover:bg-slate-50 transition-all duration-500 cursor-pointer border-slate-100 ">
        <p className="text-sm font-semibold text-slate-400 ">{label}</p>
        <div>
          <BiChevronRight className="text-slate-400" size={20} />
        </div>
      </div>
    </Card>
  );
};

export default KPICard;
