/**
 * Unified booking system — client entry points only.
 *
 * Usage:
 *   import { BookingModal, useBooking, createBooking } from "@/components/booking";
 *
 * Server-only (API routes):
 *   import { notifyBookingEvent, expireStaleBookingRequests } from "@/lib/booking/server";
 */

export { default as BookingModal } from "@/components/doctor/BookingModal";
export { default as BookingTrigger } from "./BookingTrigger";
export { default as TimeSlotPicker } from "./TimeSlotPicker";
export { useBooking } from "@/hooks/useBooking";
// Client-safe booking helpers only (no mongoose)
export * from "@/lib/booking";
