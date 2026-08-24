/**
 * A clock that both parties agree on.
 *
 * Everything about a scheduled consultation keys off "has the start time
 * arrived" — the reminder thresholds, the lobby countdown, the moment the room
 * opens. Reading that from `new Date()` means reading it from the user's own
 * device clock, and two devices that disagree by three minutes will cross the
 * same threshold three minutes apart: one person walks into an empty room and
 * concludes the product is broken.
 *
 * So the server's clock is the clock. Any response carrying a server timestamp
 * feeds `noteServerTime`, and every consumer ticks against `serverNow()`
 * instead. The offset is module-level rather than per-component so a single
 * sync serves the whole tab.
 */

let offsetMs = 0;
let synced = false;

/** Record the offset implied by a server timestamp. Cheap; call it freely. */
export function noteServerTime(serverIso: string | Date): void {
  const server = serverIso instanceof Date ? serverIso : new Date(serverIso);
  if (isNaN(server.getTime())) return;
  offsetMs = server.getTime() - Date.now();
  synced = true;
}

/** Local time corrected onto the server's clock. */
export function serverNow(): Date {
  return new Date(Date.now() + offsetMs);
}

export function isClockSynced(): boolean {
  return synced;
}

/** How far this device is from the server, for diagnostics. */
export function clockOffsetMs(): number {
  return offsetMs;
}

let inflight: Promise<void> | null = null;

/**
 * Sync from /api/time if nothing has synced yet. Concurrent callers share one
 * request, and a failure is non-fatal — an unsynced clock is the old behaviour,
 * not a broken one.
 */
export function ensureClockSynced(): Promise<void> {
  if (synced) return Promise.resolve();
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const sentAt = Date.now();
      const res = await fetch("/api/time");
      if (!res.ok) return;
      const { now } = await res.json();
      const server = new Date(now).getTime();
      if (isNaN(server)) return;
      // Charge half the round-trip to the response leg, so a slow network
      // doesn't read as a device that is running behind.
      const halfRtt = (Date.now() - sentAt) / 2;
      offsetMs = server + halfRtt - Date.now();
      synced = true;
    } catch {
      /* keep the uncorrected clock */
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
