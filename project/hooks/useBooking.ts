"use client";

import { useCallback, useState } from "react";
import {
  createBooking,
  updateBooking,
  listBookings,
  cancelBooking,
  formToCreateInput,
  validateBookingForm,
  type BookingFormState,
  type BookingRecord,
  type BookingListParams,
  type CreateBookingInput,
} from "@/lib/booking";

/**
 * Platform-wide booking hook.
 * Use from any dashboard (patient / practitioner / hospital).
 */
export function useBooking(
  mode: "patient" | "practitioner" | "hospital_admin" = "patient",
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const submitForm = useCallback(
    async (
      form: BookingFormState,
      opts?: {
        bookingId?: string | null;
        facilityId?: string;
        requirePerson?: boolean;
      },
    ) => {
      setError(null);
      const validation = validateBookingForm(form, {
        mode,
        requirePerson: opts?.requirePerson ?? true,
      });
      if (!validation.ok) {
        setError(validation.error);
        return { success: false as const, error: validation.error };
      }

      const input = formToCreateInput(form, {
        mode,
        bookingId: opts?.bookingId,
        facilityId: opts?.facilityId,
      });

      setIsSubmitting(true);
      try {
        const result = opts?.bookingId
          ? await updateBooking(opts.bookingId, input)
          : await createBooking(input);

        if (!result.success) {
          setError(result.error || "Booking failed");
          return { success: false as const, error: result.error };
        }
        return { success: true as const, data: result.data };
      } finally {
        setIsSubmitting(false);
      }
    },
    [mode],
  );

  const submitInput = useCallback(async (input: CreateBookingInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = input.bookingId
        ? await updateBooking(input.bookingId, input)
        : await createBooking(input);
      if (!result.success) {
        setError(result.error || "Booking failed");
        return { success: false as const, error: result.error };
      }
      return { success: true as const, data: result.data };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const fetchBookings = useCallback(async (params?: BookingListParams) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBookings(params);
      if (result.success && result.data) {
        setBookings(result.data);
        return result.data;
      }
      setError(result.error || "Failed to load bookings");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async (bookingId: string, reason?: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await cancelBooking(bookingId, reason);
      if (!result.success) {
        setError(result.error || "Cancel failed");
        return { success: false as const, error: result.error };
      }
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: "cancelled" as const } : b,
        ),
      );
      return { success: true as const, data: result.data };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    mode,
    isSubmitting,
    loading,
    error,
    bookings,
    submitForm,
    submitInput,
    fetchBookings,
    cancel,
    setError,
  };
}
