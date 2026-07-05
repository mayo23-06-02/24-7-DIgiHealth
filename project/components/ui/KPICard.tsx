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
      className="hover:scale-[1.02] flex justify-between flex-col cursor-pointer transition-transform  group"
      onClick={onClick}
    >
      <div>
        <div className="lg:py-4 lg:px-4 p-4 flex items-start justify-between ">
          <div
            className={`
          lg:w-12 lg:h-12 h-10 w-10 rounded-lg  flex items-center justify-center text-white 
          transition-all duration-500 
          ${color === "primary" ? "bg-primary" : color === "emerald" ? "bg-emerald-500" : color === "red" ? "bg-red-500" : "bg-slate-800"}
        `}
          >
            {icon}
          </div>

          {trend !== undefined && (
            <div
              className={`
            flex items-center gap-1 font-bold px-2 py-1 rounded-full lg:text-xs text-[8px] 
            ${trend >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}
          `}
            >
              {trend >= 0 ? <BiTrendingUp /> : <BiTrendingDown />}
              <p>{Math.abs(trend)}%</p>
            </div>
          )}
        </div>

        <div className="space-y-1 pb-4 px-4">
          <div className="flex items-baseline gap-1">
            <h4 className="text-2xl lg:text-4xl font-medium text-slate-900 tracking-tight font-grotesk">
              {value}
            </h4>
            {unit && (
              <span className="text-md lg:text-lg font-semibold text-slate-500">
                {unit}
              </span>
            )}
          </div>
          {description && (
            <p className="lg:text-sm text-[14px] text-slate-500  leading-tight">
              {description}
            </p>
          )}
        </div>
        <div className="py-4 lg:px-6 px-4 flex items-center justify-between border-t hover:bg-slate-50 transition-all duration-500 cursor-pointer border-slate-100 ">
          <p className="text-sm font-semibold text-slate-500 ">{label}</p>
          <div>
            <BiChevronRight className="text-slate-500" size={20} />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default KPICard;
