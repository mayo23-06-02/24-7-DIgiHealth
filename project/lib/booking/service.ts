import type {
  BookingApiResult,
  BookingListParams,
  BookingRecord,
  BookingSlot,
  CreateBookingInput,
} from "./types";

/**
 * Unified client for platform booking APIs.
 * Prefer this over calling role-specific endpoints from UI components.
 */

export async function createBooking(
  input: CreateBookingInput,
): Promise<BookingApiResult<BookingRecord>> {
  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json.error || json.message || "Booking failed",
      };
    }
    return {
      success: true,
      data: normalizeBooking(json.data || json.booking || json),
    };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function updateBooking(
  bookingId: string,
  input: Partial<CreateBookingInput>,
): Promise<BookingApiResult<BookingRecord>> {
  try {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json.error || json.message || "Update failed",
      };
    }
    return {
      success: true,
      data: normalizeBooking(json.data || json.booking || json),
    };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function listBookings(
  params: BookingListParams = {},
): Promise<BookingApiResult<BookingRecord[]>> {
  try {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== "") qs.set(k, String(v));
    });
    const res = await fetch(`/api/bookings?${qs.toString()}`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json.error || "Failed to load bookings",
      };
    }
    const rows = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json)
        ? json
        : [];
    return {
      success: true,
      data: rows.map(normalizeBooking),
    };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function cancelBooking(
  bookingId: string,
  reason?: string,
): Promise<BookingApiResult<BookingRecord>> {
  try {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", reason }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || "Cancel failed" };
    }
    return {
      success: true,
      data: normalizeBooking(json.data || json),
    };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function fetchDaySlots(params: {
  practitionerId: string;
  date: string;
  durationMinutes?: number;
  excludeBookingId?: string | null;
}): Promise<BookingApiResult<{ slots: BookingSlot[]; summary?: Record<string, number> }>> {
  try {
    const qs = new URLSearchParams({
      practitionerId: params.practitionerId,
      date: params.date,
    });
    if (params.durationMinutes) {
      qs.set("durationMinutes", String(params.durationMinutes));
    }
    if (params.excludeBookingId) {
      qs.set("excludeBookingId", params.excludeBookingId);
    }
    const res = await fetch(`/api/bookings/slots?${qs.toString()}`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json.error || "Failed to load slots",
      };
    }
    return {
      success: true,
      data: {
        slots: json.data?.slots || [],
        summary: json.data?.summary,
      },
    };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

function normalizeBooking(raw: any): BookingRecord {
  const id = String(raw.id || raw._id || raw.consultationId || "");
  return {
    id,
    consultationId: String(raw.consultationId || id),
    patientId: String(raw.patientId?._id || raw.patientId || ""),
    patientName: raw.patientName,
    practitionerId: String(
      raw.practitionerId?._id || raw.practitionerId || "",
    ),
    practitionerName: raw.practitionerName,
    practitionerAvatar: raw.practitionerAvatar || raw.practitionerId?.avatarUrl,
    facilityId: raw.facilityId ? String(raw.facilityId) : undefined,
    scheduledStart: new Date(
      raw.scheduledStart || raw.scheduledStartTime,
    ).toISOString(),
    scheduledEnd: new Date(
      raw.scheduledEnd || raw.scheduledEndTime,
    ).toISOString(),
    status: raw.status,
    type: raw.type || "video",
    reason: raw.reason || raw.chiefComplaint,
    durationMinutes: raw.durationMinutes,
    source: raw.source,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}
