/**
 * The session window for a scheduled consultation.
 *
 * A consultation is not a phone call that somebody places — it is a room at a
 * known address that opens at a known time. These bounds are the whole of that
 * "known time", and both the server (which decides whether to hand out a token)
 * and the client (which decides what to render) derive their behaviour from
 * them, so the two can never disagree about what state a session is in.
 */

/** The lobby opens, and tokens start being issued, this far before the start. */
export const LOBBY_OPENS_BEFORE_MS = 5 * 60 * 1000;

/**
 * How long past the scheduled end a session stays joinable. Consultations run
 * over, and someone who drops at the last minute needs to be able to come back;
 * a hard cut at the scheduled end would strand them.
 */
export const GRACE_AFTER_END_MS = 15 * 60 * 1000;

/** How long before the start the client quietly fetches the token it will need. */
export const TOKEN_PREFETCH_BEFORE_MS = 30 * 1000;

export type SessionState =
  | "early" // before the lobby opens — countdown only, no token
  | "lobby" // lobby open, waiting for the start time
  | "live" // joinable now
  | "closed"; // past the grace period, or the consultation is over/cancelled

export interface SessionWindow {
  opensAt: Date;
  startsAt: Date;
  endsAt: Date;
  closesAt: Date;
}

export function sessionWindow(start: Date, end: Date): SessionWindow {
  return {
    opensAt: new Date(start.getTime() - LOBBY_OPENS_BEFORE_MS),
    startsAt: start,
    endsAt: end,
    closesAt: new Date(end.getTime() + GRACE_AFTER_END_MS),
  };
}

export function sessionStateAt(now: Date, w: SessionWindow): SessionState {
  const t = now.getTime();
  if (t >= w.closesAt.getTime()) return "closed";
  if (t >= w.startsAt.getTime()) return "live";
  if (t >= w.opensAt.getTime()) return "lobby";
  return "early";
}

/** States in which the server will issue a LiveKit token. */
export function isJoinable(state: SessionState): boolean {
  return state === "lobby" || state === "live";
}
