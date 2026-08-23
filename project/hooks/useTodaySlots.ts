"use client";

import { useEffect, useState } from "react";
import { fetchDaySlotsBatch, todayDateString, type BookingSlot } from "@/lib/booking";

/**
 * Today's genuinely-open slots for a whole list of practitioners, resolved in
 * a single request.
 *
 * Replaces the per-card fetch that turned a 20-doctor list into 20 round
 * trips. Call it once in the list/carousel component and pass each doctor
 * their slice down as a prop.
 *
 * A slot must clear two independent "not in the past" checks before it shows:
 * the server's `available` flag (accurate as of the fetch) and a live
 * comparison against the browser clock, re-evaluated every minute — a
 * marketing page can sit open far longer than the data stays fresh.
 */
export function useTodaySlots(
  practitionerIds: string[],
  max = 6,
): Record<string, BookingSlot[]> {
  const [raw, setRaw] = useState<Record<string, BookingSlot[]>>({});
  const [, setTick] = useState(0);

  // Join to a primitive so the effect isn't re-run by a new array identity.
  const key = practitionerIds.filter(Boolean).join(",");

  useEffect(() => {
    if (!key) {
      setRaw({});
      return;
    }
    let cancelled = false;
    fetchDaySlotsBatch({ practitionerIds: key.split(","), date: todayDateString() }).then(
      (map) => {
        if (!cancelled) setRaw(map);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Re-render each minute so a slot disappears as its time passes, rather
  // than lingering until the next navigation.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const date = todayDateString();
  const now = Date.now();
  const out: Record<string, BookingSlot[]> = {};

  for (const [id, list] of Object.entries(raw)) {
    out[id] = (list || [])
      .filter((s) => s.available && new Date(`${date}T${s.time}:00`).getTime() > now)
      .slice(0, max);
  }

  return out;
}
