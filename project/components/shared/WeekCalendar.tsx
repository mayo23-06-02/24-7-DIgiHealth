"use client";

import React, { useMemo, useState } from "react";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";
import Card from "../ui/Card";

interface WeekCalendarProps {
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

const WeekCalendar: React.FC<WeekCalendarProps> = ({
  onDateSelect,
  selectedDate,
}) => {
  const [viewDate, setViewDate] = useState(new Date());

  const days = useMemo(() => {
    const arr = [];
    const start = new Date(viewDate);
    start.setDate(start.getDate() - start.getDay()); // Start of week

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [viewDate]);

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) =>
    d.toDateString() === selectedDate.toDateString();

  return (
    <Card className="flex flex-col gap-4 overflow-visible" variant="glass">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-medium text-slate-900 tracking-tight">
          {viewDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => {
              const d = new Date(viewDate);
              d.setDate(d.getDate() - 7);
              setViewDate(d);
            }}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all"
          >
            <BiChevronLeft size={20} />
          </button>
          <button
            onClick={() => {
              const d = new Date(viewDate);
              d.setDate(d.getDate() + 7);
              setViewDate(d);
            }}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all"
          >
            <BiChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center gap-1">
        {days.map((day, i) => (
          <button
            key={i}
            onClick={() => onDateSelect(day)}
            className={`
              flex-1 flex flex-col items-center py-4 rounded-2xl transition-all duration-300
              ${isSelected(day) ? "bg-primary text-white shadow-none shadow-primary/30 scale-105" : "hover:bg-slate-50 text-slate-400"}
            `}
          >
            <span className="text-xs font-bold uppercase tracking-normal mb-1 opacity-60">
              {day.toLocaleString("default", { weekday: "short" })}
            </span>
            <span className="text-lg font-bold tracking-tighter leading-none">
              {day.getDate()}
            </span>
            {isToday(day) && !isSelected(day) && (
              <span className="mt-1 w-1 h-1 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </Card>
  );
};

export default WeekCalendar;
