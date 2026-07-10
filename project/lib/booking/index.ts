/**
 * Client-safe booking exports only.
 * Do NOT re-export server modules (notifications, expire) — they import mongoose
 * and will break the browser bundle with "Can't resolve 'async_hooks'".
 *
 * Server-only:
 *   import { notifyBookingEvent } from "@/lib/booking/notifications";
 *   import { expireStaleBookingRequests } from "@/lib/booking/expire";
 */

export * from "./types";
export * from "./slots";
export * from "./validation";
export * from "./service";
