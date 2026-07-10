import type { BookingSlot, SlotStatus } from "./types";

/** Operating hours: 08:00 inclusive → 24:00 exclusive (last slot 23:30 for 30‑min) */
export const OPERATING_START_HOUR = 8;
export const OPERATING_END_HOUR = 24;
export const DEFAULT_SLOT_MINUTES = 30;

/**
 * Generate fixed-interval time slots for operating hours (8am–midnight).
 * With 30‑min steps: 08:00 … 23:30 (32 slots).
 */
export function generateTimeSlots(options?: {
  startHour?: number;
  endHour?: number;
  stepMinutes?: number;
}): string[] {
  const startHour = options?.startHour ?? OPERATING_START_HOUR;
  const endHour = options?.endHour ?? OPERATING_END_HOUR;
  const step = options?.stepMinutes ?? DEFAULT_SLOT_MINUTES;

  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += step) {
      // Do not emit a slot that starts at or after endHour
      if (hour === endHour) break;
      // For endHour=24, allow 23:00 and 23:30 only
      if (hour === 23 && minute + step > 60) break;
      const h = String(hour).padStart(2, "0");
      const m = String(minute).padStart(2, "0");
      slots.push(`${h}:${m}`);
    }
  }
  return slots;
}

/**
 * Combine local date (YYYY-MM-DD) + time (HH:mm) into a Date in local timezone.
 */
export function combineLocalDateTime(date: string, time: string): Date {
  // Explicit local components avoid UTC parse ambiguity on some engines
  const [y, mo, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, (mo || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function formatBookingDate(dateStr: string): string {
  const d = combineLocalDateTime(dateStr, "00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Format HH:mm → friendly 12h label e.g. "2:30 PM" */
export function formatSlotLabel(time: string): string {
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function upcomingDateStrings(count = 14): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    out.push(toLocalDateString(d));
  }
  return out;
}

export function todayDateString(): string {
  return upcomingDateStrings(1)[0];
}

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Parse "HH:mm" to minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export interface BuildSlotsInput {
  date: string;
  durationMinutes?: number;
  /** Existing consultations that block the calendar */
  bookings?: { start: Date | string; end: Date | string; id?: string }[];
  /**
   * Optional practitioner day schedule windows.
   * If provided, times outside open windows become "unavailable".
   * If empty/missing, full operating hours are open (subject to past/booked).
   */
  scheduleWindows?: { startTime: string; endTime: string; status?: string }[];
  /** Booking being edited — excluded from conflict checks */
  excludeBookingId?: string | null;
  now?: Date;
}

/**
 * Build full operating-day slots with past / booked / unavailable / available.
 */
export function buildScheduleSlots(input: BuildSlotsInput): BookingSlot[] {
  const duration = input.durationMinutes || DEFAULT_SLOT_MINUTES;
  const now = input.now || new Date();
  const times = generateTimeSlots();

  const bookings = (input.bookings || [])
    .filter((b) => !input.excludeBookingId || b.id !== input.excludeBookingId)
    .map((b) => ({
      start: new Date(b.start).getTime(),
      end: new Date(b.end).getTime(),
    }));

  const windows = input.scheduleWindows || [];
  const hasSchedule = windows.length > 0;

  // Pre-mark times that schedule marks as booked
  const scheduleBookedTimes = new Set<string>();
  if (hasSchedule) {
    for (const w of windows) {
      if (String(w.status || "").toLowerCase() === "booked") {
        // Expand window to 30-min ticks
        let t = timeToMinutes(w.startTime);
        const end = timeToMinutes(w.endTime);
        while (t < end) {
          const hh = String(Math.floor(t / 60)).padStart(2, "0");
          const mm = String(t % 60).padStart(2, "0");
          scheduleBookedTimes.add(`${hh}:${mm}`);
          t += DEFAULT_SLOT_MINUTES;
        }
      }
    }
  }

  return times.map((time) => {
    const start = combineLocalDateTime(input.date, time);
    const end = addMinutes(start, duration);
    const startMs = start.getTime();
    const endMs = end.getTime();

    let status: SlotStatus = "available";
    let reason: string | undefined;

    // 1) Past slots
    if (startMs < now.getTime()) {
      status = "past";
      reason = "Past";
    }

    // 2) Outside practitioner open windows (if schedule defined)
    if (status === "available" && hasSchedule) {
      const open = windows.some((w) => {
        const st = String(w.status || "available").toLowerCase();
        if (st === "booked" || st === "blocked" || st === "closed") return false;
        const wStart = timeToMinutes(w.startTime);
        const wEnd = timeToMinutes(w.endTime);
        const slotStart = timeToMinutes(time);
        const slotEnd = slotStart + duration;
        return slotStart >= wStart && slotEnd <= wEnd;
      });
      if (!open) {
        // Still show slot, but greyed if not in an open window
        // (schedule may only define partial day — rest is unavailable)
        const coveredAtAll = windows.some((w) => {
          const wStart = timeToMinutes(w.startTime);
          const wEnd = timeToMinutes(w.endTime);
          const slotStart = timeToMinutes(time);
          return slotStart >= wStart && slotStart < wEnd;
        });
        if (!coveredAtAll) {
          // No schedule coverage at this hour → still allow within operating hours
          // when schedule is partial; only mark unavailable if schedule explicitly
          // covers the day. Prefer open operating hours as default.
        } else {
          status = "unavailable";
          reason = "Closed";
        }
      }
    }

    // 3) Schedule-marked booked
    if (status === "available" && scheduleBookedTimes.has(time)) {
      status = "booked";
      reason = "Booked";
    }

    // 4) Existing consultations overlap
    if (status === "available" || status === "unavailable") {
      const conflict = bookings.some((b) =>
        rangesOverlap(startMs, endMs, b.start, b.end),
      );
      if (conflict) {
        status = "booked";
        reason = "Booked";
      }
    }

    return {
      time,
      available: status === "available",
      status,
      reason,
      label: formatSlotLabel(time),
    };
  });
}

/** Legacy helper kept for callers that only need a whitelist filter */
export function buildDaySlots(
  scheduleWhitelist?: string[] | null,
  options?: { startHour?: number; endHour?: number; stepMinutes?: number },
): BookingSlot[] {
  const all = generateTimeSlots(options);
  if (!scheduleWhitelist?.length) {
    return all.map((time) => ({
      time,
      available: true,
      status: "available" as const,
      label: formatSlotLabel(time),
    }));
  }
  const set = new Set(scheduleWhitelist);
  return all.map((time) => {
    const ok = set.has(time);
    return {
      time,
      available: ok,
      status: (ok ? "available" : "unavailable") as SlotStatus,
      reason: ok ? undefined : "Unavailable",
      label: formatSlotLabel(time),
    };
  });
}

export function periodOfDay(time: string): "Morning" | "Afternoon" | "Evening" {
  const h = parseInt(time.split(":")[0] || "0", 10);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
