import React from "react";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";

interface CalendarHeaderProps {
  onPrev: () => void;
  onNext: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ onPrev, onNext }) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold font-grotesk text-slate-800">
          Schedule at a Glance
        </h1>
        <p className="text-sm font-grotesk font-thin text-slate-500">
          Manage your appointments and medication reminders.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          className="w-10 h-10 hover:bg-primary hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-500"
        >
          <BiChevronLeft size={24} />
        </button>
        <button
          onClick={onNext}
          className="w-10 h-10 hover:bg-primary hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-500"
        >
          <BiChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;
