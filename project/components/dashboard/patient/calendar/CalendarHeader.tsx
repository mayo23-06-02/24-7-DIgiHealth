import React from "react";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";

interface CalendarHeaderProps {
  onPrev: () => void;
  onNext: () => void;
  action?: React.ReactNode;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ onPrev, onNext, action }) => {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg font-bold font-grotesk text-slate-800">
          Schedule at a Glance
        </h1>
        <p className="text-sm lg:text-base font-grotesk  text-slate-500 truncate">
          Manage your appointments and medication reminders.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        <button
          onClick={onPrev}
          className="w-10 h-10 hover:bg-primary hover:text-white rounded-lg transition-all border border-slate-100 flex items-center justify-center text-slate-500"
        >
          <BiChevronLeft size={24} />
        </button>
        <button
          onClick={onNext}
          className="w-10 h-10 hover:bg-primary hover:text-white rounded-lg transition-all border border-slate-100 flex items-center justify-center text-slate-500"
        >
          <BiChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;
