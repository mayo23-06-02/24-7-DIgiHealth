"use client";

import { useMemo } from "react";
import { BiLoaderAlt, BiTime, BiLockAlt, BiCheck } from "react-icons/bi";
import type { BookingSlot, SlotStatus } from "@/lib/booking";
import { periodOfDay } from "@/lib/booking/slots";

const STATUS_STYLES: Record<
  SlotStatus,
  { idle: string; selected: string; cursor: string }
> = {
  available: {
    idle:
      "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5 hover:text-primary shadow-sm",
    selected:
      "border-primary bg-primary text-white shadow-md shadow-primary/25 ring-2 ring-primary/20",
    cursor: "cursor-pointer",
  },
  past: {
    idle: "border-slate-100 bg-slate-100/80 text-slate-400 line-through decoration-slate-300",
    selected: "border-slate-200 bg-slate-200 text-slate-400",
    cursor: "cursor-not-allowed",
  },
  booked: {
    idle: "border-slate-100 bg-slate-100 text-slate-400",
    selected: "border-slate-200 bg-slate-200 text-slate-400",
    cursor: "cursor-not-allowed",
  },
  unavailable: {
    idle: "border-slate-100 bg-slate-50 text-slate-300",
    selected: "border-slate-100 bg-slate-50 text-slate-300",
    cursor: "cursor-not-allowed",
  },
};

export default function TimeSlotPicker({
  slots,
  selectedTime,
  onSelect,
  loading = false,
  durationMinutes = 30,
  emptyMessage = "No slots available for this date.",
}: {
  slots: BookingSlot[];
  selectedTime: string;
  onSelect: (time: string) => void;
  loading?: boolean;
  durationMinutes?: number;
  emptyMessage?: string;
}) {
  const groups = useMemo(() => {
    const order: Array<"Morning" | "Afternoon" | "Evening"> = [
      "Morning",
      "Afternoon",
      "Evening",
    ];
    const map = new Map<string, BookingSlot[]>();
    for (const p of order) map.set(p, []);
    for (const slot of slots) {
      const p = periodOfDay(slot.time);
      map.get(p)!.push(slot);
    }
    return order
      .map((period) => ({ period, items: map.get(period) || [] }))
      .filter((g) => g.items.length > 0);
  }, [slots]);

  const summary = useMemo(() => {
    const available = slots.filter((s) => s.status === "available").length;
    const booked = slots.filter((s) => s.status === "booked").length;
    const past = slots.filter((s) => s.status === "past").length;
    return { available, booked, past, total: slots.length };
  }, [slots]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
        <BiLoaderAlt className="animate-spin text-primary" size={28} />
        <p className="text-sm font-medium">Loading available times…</p>
      </div>
    );
  }

  if (!slots.length) {
    return (
      <p className="text-sm text-rose-500 font-semibold px-1 py-6 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <label className="text-sm font-bold text-slate-500 tracking-normal flex items-center gap-2">
          <BiTime size={14} className="text-primary" />
          Select time
          <span className="font-medium text-slate-400">
            · {durationMinutes}-min slots · 8:00 AM – 12:00 AM
          </span>
        </label>
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
          {summary.available} open
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-1 text-[11px] font-semibold text-slate-500">
        <LegendDot className="bg-white border-slate-200" label="Available" />
        <LegendDot className="bg-primary border-primary" label="Selected" />
        <LegendDot className="bg-slate-100 border-slate-100" label="Past / booked" />
      </div>

      <div className="max-h-[280px] overflow-y-auto custom-scrollbar pr-1 space-y-5">
        {groups.map(({ period, items }) => (
          <div key={period}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {period}
              </h5>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] font-semibold text-slate-400">
                {items.filter((i) => i.available).length} free
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.map((slot) => {
                const isSelected = selectedTime === slot.time;
                const disabled = !slot.available;
                const styles = STATUS_STYLES[slot.status] || STATUS_STYLES.unavailable;

                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={disabled}
                    title={
                      disabled
                        ? slot.reason || slot.status
                        : `Book ${slot.label || slot.time}`
                    }
                    onClick={() => {
                      if (!disabled) onSelect(slot.time);
                    }}
                    className={`relative p-2 px-1 rounded-lg text-xs font-bold transition-all duration-200 border-2 ${
                      isSelected && !disabled ? styles.selected : styles.idle
                    } ${styles.cursor}`}
                  >
                    <span className="block tabular-nums">
                      {slot.label || slot.time}
                    </span>
                    {isSelected && !disabled && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-primary flex items-center justify-center shadow">
                        <BiCheck size={12} />
                      </span>
                    )}
                    {slot.status === "booked" && (
                      <span className="absolute top-1 right-1 text-slate-300">
                        <BiLockAlt size={10} />
                      </span>
                    )}
                    {disabled && slot.reason && (
                      <span className="block text-[9px] font-semibold mt-0.5 opacity-70 normal-case">
                        {slot.reason}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {summary.available === 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-medium">
          {summary.booked > 0 && summary.booked + summary.past >= summary.total
            ? "This day is fully booked. Try another date."
            : summary.past === summary.total
              ? "All remaining times today have passed. Choose another date."
              : "No open slots for this date. Try another day or a shorter duration."}
        </p>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded border ${className}`} />
      {label}
    </span>
  );
}
