import React from "react";
import { BiPlus, BiBlock } from "react-icons/bi";

interface DayCardProps {
  day: {
    dateStr: string;
    dayNum: number;
    dayName: string;
    monthName: string;
    isToday: boolean;
    isUnavailable: boolean;
    markers: { type: string; count: number }[];
  };
  idx: number;
  onSelect: (dateStr: string) => void;
  onDrop: (e: React.DragEvent, dateStr: string) => void;
  onToggleUnavailable: (dateStr: string) => void;
  getMarkerColor: (type: string) => string;
}

const DayCard: React.FC<DayCardProps> = ({
  day,
  idx,
  onSelect,
  onDrop,
  onToggleUnavailable,
  getMarkerColor,
}) => {
  return (
    <div
      key={idx}
      className="px-1 pb-6 h-full"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, day.dateStr)}
    >
      <div
        onClick={() => onSelect(day.dateStr)}
        className={`h-32 sm:h-36 lg:h-40 rounded-lg border transition-all duration-500 relative p-2 sm:p-3 flex flex-col justify-between group cursor-pointer ${
          day.isUnavailable
            ? "bg-slate-50 border-slate-100 opacity-50 grayscale pointer-events-none"
            : day.isToday
              ? "border-primary bg-primary/5 shadow-none shadow-primary/5 ring-1 ring-primary/20"
              : "border-slate-100 bg-white hover:border-primary/50 hover:shadow-none hover:shadow-slate-200/50"
        }`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 items-center">
              {day.markers.map((m, i) => (
                <div key={i} className="flex items-center gap-0.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${getMarkerColor(m.type)}`}
                  />
                  {m.count > 1 && (
                    <span className="text-[9px] font-bold text-slate-500">
                      {m.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <span
              className={`items-center text-xs sm:text-sm font-semibold whitespace-nowrap ${
                day.isToday ? "text-primary flex gap-1" : "text-slate-500"
              }`}
            >
              {day.dayName} {day.monthName}
            </span>
          </div>
          {day.isToday && (
            <div className="text-[10px]  uppercase font-bold bg-primary px-3 py-1 rounded-full text-white">
             <p> Today</p>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <button
            disabled={day.isUnavailable}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(day.dateStr);
            }}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              day.isUnavailable
                ? "bg-slate-100 text-slate-300 pointer-events-none"
                : "text-slate-500 bg-slate-200 hover:text-primary hover:bg-primary/10"
            }`}
          >
            <BiPlus size={14} />
          </button>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex flex-col-reverse gap-2">
            <span
              className={`text-2xl sm:text-3xl font-semibold tracking-tighter ${
                day.isToday
                  ? "text-primary"
                  : "text-slate-200 group-hover:text-primary transition-colors"
              }`}
            >
              {day.dayNum.toString().padStart(2, "0")}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleUnavailable(day.dateStr);
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all ${
                day.isUnavailable
                  ? "bg-primary text-white"
                  : "text-slate-500 bg-slate-100 hover:text-primary"
              }`}
            >
              <BiBlock size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayCard;
