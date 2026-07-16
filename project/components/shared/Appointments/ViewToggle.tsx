"use client";
import React from "react";
import { BiListUl, BiCalendarWeek } from "react-icons/bi";

export type AppointmentView = "list" | "calendar";

interface Props {
  view: AppointmentView;
  onChange: (view: AppointmentView) => void;
}

export default function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="inline-flex items-center bg-slate-100 rounded-full p-1 gap-1 self-start shrink-0">
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={view === "list"}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
          view === "list"
            ? "bg-white text-primary shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <BiListUl size={16} />
        List
      </button>
      <button
        type="button"
        onClick={() => onChange("calendar")}
        aria-pressed={view === "calendar"}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
          view === "calendar"
            ? "bg-white text-primary shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <BiCalendarWeek size={16} />
        Calendar
      </button>
    </div>
  );
}
