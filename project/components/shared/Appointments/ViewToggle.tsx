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
    <div className="inline-flex items-center bg-border rounded-lg p-1 gap-0 self-start shrink-0 ring-1 ring-border/50">
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={view === "list"}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${
          view === "list"
            ? "bg-primary text-white shadow-md shadow-primary/20"
            : "text-ink-600 hover:text-ink-900 hover:bg-surface-soft"
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
        className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${
          view === "calendar"
            ? "bg-primary text-white shadow-md shadow-primary/20"
            : "text-ink-600 hover:text-ink-900 hover:bg-surface-soft"
        }`}
        title="Calendar view"
      >
        <BiCalendarWeek size={18} className="shrink-0" />
        <span>Calendar</span>
      </button>
    </div>
  );
}
