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
    <div className="inline-flex items-center bg-surface-soft border border-border rounded-xl p-1.5 gap-0 self-start shrink-0 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={view === "list"}
        className={`flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ease-out ${
          view === "list"
            ? "bg-white text-primary shadow-md shadow-primary/15"
            : "text-ink-600 hover:text-primary"
        }`}
        title="List view"
      >
        <BiListUl size={18} className="shrink-0" />
        <span>List</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("calendar")}
        aria-pressed={view === "calendar"}
        className={`flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ease-out ${
          view === "calendar"
            ? "bg-white text-primary shadow-md shadow-primary/15"
            : "text-ink-600 hover:text-primary"
        }`}
        title="Calendar view"
      >
        <BiCalendarWeek size={18} className="shrink-0" />
        <span>Calendar</span>
      </button>
    </div>
  );
}
