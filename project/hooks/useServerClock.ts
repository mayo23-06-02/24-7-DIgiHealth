"use client";

import { useEffect, useState } from "react";
import { ensureClockSynced, serverNow } from "@/lib/time/serverClock";

/**
 * A ticking clock corrected onto the server's time.
 *
 * Use this anywhere a decision depends on "what time is it" — countdowns,
 * reminder thresholds, session windows — so that two devices with differently
 * set clocks reach the same conclusion at the same moment.
 */
export function useServerClock(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => serverNow());

  useEffect(() => {
    let cancelled = false;

    void ensureClockSynced().then(() => {
      if (!cancelled) setNow(serverNow());
    });

    const timer = setInterval(() => setNow(serverNow()), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
