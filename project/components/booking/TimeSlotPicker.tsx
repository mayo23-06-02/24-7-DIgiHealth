"use client";

import { useMemo, useState } from "react";
import {
  BiLoaderAlt,
  BiTime,
  BiLockAlt,
  BiCheck,
  BiChevronDown,
} from "react-icons/bi";
import type { BookingSlot, SlotStatus } from "@/lib/booking";
import { periodOfDay } from "@/lib/booking/slots";

const STATUS_STYLES: Record<
  SlotStatus,
  { idle: string; selected: string; cursor: string }
> = {
  available: {
    idle:
      "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5 hover:text-primary ",
    selected:
      "border-primary bg-primary text-white  shadow-primary/25 ring-2 ring-primary/20",
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
  /** Periods the user has chosen to reopen after they collapsed themselves. */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
          {summary.available} open
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-1 text-[11px] font-semibold text-slate-500">
        <LegendDot className="bg-white border-slate-200" label="Available" />
        <LegendDot className="bg-primary border-primary" label="Selected" />
        <LegendDot className="bg-slate-100 border-slate-100" label="Past / booked" />
      </div>

      <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-1 space-y-3">
        {groups.map(({ period, items }) => {
          const freeCount = items.filter((i) => i.available).length;
          const isExhausted = freeCount === 0 && items.length > 0;
          const isExpanded = expanded[period] ?? false;

          /*
           * A period with nothing left collapses to its heading.
           *
           * Booking late in the day meant scrolling past two full grids of
           * greyed-out morning and afternoon slots to reach the one or two
           * that were still open. The count stays visible so the day still
           * reads as accounted for, and the row expands if someone wants to
           * see what was there.
           */
          if (isExhausted && !isExpanded) {
            return (
              <button
                key={period}
                type="button"
                onClick={() => setExpanded((e) => ({ ...e, [period]: true }))}
                className="flex w-full items-center gap-2 px-1 py-1 text-left group"
              >
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {period}
                </h5>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-600">
                  {items.length} {items.length === 1 ? "slot" : "slots"} unavailable
                </span>
                <BiChevronDown size={14} className="text-slate-300 group-hover:text-slate-500" />
              </button>
            );
          }

          return (
          <div key={period}>
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {period}
              </h5>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] font-semibold text-slate-400">
                {freeCount} free
              </span>
              {isExhausted && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [period]: false }))}
                  className="text-[10px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  Hide
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
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
                    className={`relative py-1.5 px-1 rounded-md text-[11px] font-bold transition-all duration-200 border ${
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
                    {/* The reason text is a tooltip only. Rendered inside every
                        disabled tile it doubled their height, which is most of
                        what made the grid long. */}
                    {slot.status === "booked" && (
                      <span className="absolute top-0.5 right-0.5 text-slate-300">
                        <BiLockAlt size={9} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
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
