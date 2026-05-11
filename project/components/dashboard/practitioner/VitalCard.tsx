import React from "react";
import { BiChevronRight, BiTrendingUp } from "react-icons/bi";
import Card from "@/components/ui/Card";

interface VitalCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  status: string;
  trend: string;
  onClick?: () => void;
}

const VitalCard: React.FC<VitalCardProps> = ({
  icon,
  label,
  value,
  unit,
  status,
  trend,
  onClick,
}) => {
  return (
    <Card 
      className="p-0 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-6">
          <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center text-white">
            {icon}
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
            <BiTrendingUp size={12} />
            {trend}
          </div>
        </div>

        <div className="space-y-1 mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-800 font-grotesk">{value}</span>
            <span className="text-sm font-medium text-slate-400">{unit}</span>
          </div>
          <p className="text-xs font-medium text-slate-400">{status}</p>
        </div>
      </div>

      <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between group-hover:bg-slate-50 transition-colors">
        <span className="text-xs font-bold text-slate-600">{label}</span>
        <BiChevronRight className="text-slate-400 group-hover:text-primary transition-colors" size={18} />
      </div>
    </Card>
  );
};

export default VitalCard;
