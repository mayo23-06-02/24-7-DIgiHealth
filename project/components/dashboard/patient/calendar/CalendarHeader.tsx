import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarHeaderProps {
  onPrev: () => void;
  onNext: () => void;
  action?: React.ReactNode;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ onPrev, onNext, action }) => {
  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg font-bold font-grotesk text-ink-900">
          Schedule at a Glance
        </h1>
        <p className="text-sm lg:text-base font-grotesk text-slate-500">
          Manage your appointments and medication reminders.
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 shrink-0">
        {action}
        <div className="gap-2 flex items-center">
          <button
          onClick={onPrev}
          aria-label="Previous"
          className="w-10 h-10 hover:bg-primary hover:text-white rounded-lg transition-all border border-slate-200 flex items-center justify-center text-slate-500 shrink-0"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={onNext}
          aria-label="Next"
          className="w-10 h-10 hover:bg-primary hover:text-white rounded-lg transition-all border border-slate-200 flex items-center justify-center text-slate-500 shrink-0"
        >
          <ChevronRight size={22} />
        </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
