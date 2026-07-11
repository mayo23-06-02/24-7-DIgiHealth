"use client";

import React, { useState, useMemo } from 'react';
import { BiChevronDown } from 'react-icons/bi';

interface CalendarCarouselProps {
  viewDate: Date;
  selectedDate: Date;
  onViewDateChange: (date: Date) => void;
  onSelectedDateChange: (date: Date) => void;
}

export default function CalendarCarousel({
  viewDate,
  selectedDate,
  onViewDateChange,
  onSelectedDateChange,
}: CalendarCarouselProps) {
  const [isMonthOpen, setIsMonthOpen] = useState(false);

  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = -2; i <= 5; i++) {
      options.push(new Date(today.getFullYear(), today.getMonth() + i, 1));
    }
    return options;
  }, []);

  const today = new Date();
  const isCurrentMonth = viewDate.getMonth() === today.getMonth() &&
    viewDate.getFullYear() === today.getFullYear();
  const startDay = isCurrentMonth
    ? today
    : new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const calendarDays = Array.from({ length: 15 }, (_, i) => {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    return d;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800 font-grotesk">
          Upcoming Appointments
        </h3>
        <div className="relative">
          <button
            onClick={() => setIsMonthOpen(!isMonthOpen)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            <BiChevronDown className={`transition-transform duration-200 ${isMonthOpen ? 'rotate-180' : ''}`} />
          </button>
          {isMonthOpen && (
            <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-slate-100 rounded-lg shadow-lg z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
              {monthOptions.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onViewDateChange(m);
                    setIsMonthOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                    m.getMonth() === viewDate.getMonth() &&
                    m.getFullYear() === viewDate.getFullYear()
                      ? 'text-primary bg-primary/5'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
        {calendarDays.map((date, i) => {
          const isActive =
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
          const isToday = i === 0;
          return (
            <button
              key={i}
              onClick={() => onSelectedDateChange(new Date(date))}
              className={`flex flex-col items-center gap-1 shrink-0 w-14 py-3 rounded-lg border font-bold transition-all duration-200 ${
                isActive
                  ? 'border-primary bg-primary/5 text-primary shadow-none ring-1 ring-primary/20'
                  : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`text-[9px] tracking-normal font-bold ${
                isActive ? 'text-primary' : isToday ? 'text-primary/60' : 'text-slate-500'
              }`}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-base leading-none">{date.getDate()}</span>
              {isToday && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}