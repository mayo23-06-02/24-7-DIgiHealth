import type { CreateBookingInput, ConsultationMethod } from "./types";
import { combineLocalDateTime, addMinutes } from "./slots";

export interface BookingFormState {
  date: string;
  time: string;
  reason: string;
  durationMinutes: number;
  type: ConsultationMethod;
  patientId?: string;
  practitionerId?: string;
}

export function validateBookingForm(
  form: BookingFormState,
  opts: {
    mode: "patient" | "practitioner" | "hospital_admin";
    requirePerson: boolean;
  },
): { ok: true } | { ok: false; error: string } {
  if (!form.date || !form.time) {
    return { ok: false, error: "Please select a date and time." };
  }
  if (!form.reason?.trim()) {
    return { ok: false, error: "Please describe the reason for this consultation." };
  }

  if (opts.requirePerson) {
    if (opts.mode === "patient" && !form.practitionerId) {
      return { ok: false, error: "Please select a practitioner." };
    }
    if (
      (opts.mode === "practitioner" || opts.mode === "hospital_admin") &&
      !form.patientId
    ) {
      return { ok: false, error: "Please select a patient." };
    }
  }

  const start = combineLocalDateTime(form.date, form.time);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: "The selected date or time is invalid." };
  }
  if (start.getTime() < Date.now() - 60_000) {
    return {
      ok: false,
      error: "Cannot book an appointment in the past. Choose a future time.",
    };
  }

  const duration = form.durationMinutes || 30;
  if (duration < 5 || duration > 240) {
    return { ok: false, error: "Duration must be between 5 and 240 minutes." };
  }

  return { ok: true };
}

export function formToCreateInput(
  form: BookingFormState,
  opts: {
    mode: "patient" | "practitioner" | "hospital_admin";
    bookingId?: string | null;
    facilityId?: string;
  },
): CreateBookingInput {
  const start = combineLocalDateTime(form.date, form.time);
  const end = addMinutes(start, form.durationMinutes || 30);

  const input: CreateBookingInput = {
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
    type: form.type || "video",
    reason: form.reason.trim(),
    chiefComplaint: form.reason.trim(),
    durationMinutes: form.durationMinutes || 30,
    facilityId: opts.facilityId,
    bookingId: opts.bookingId || undefined,
  };

  if (opts.mode === "patient") {
    input.practitionerId = form.practitionerId;
    input.source = "patient_self_serve";
    input.status = "requested";
  } else if (opts.mode === "practitioner") {
    input.patientId = form.patientId;
    input.source = "practitioner_schedule";
    input.status = opts.bookingId ? undefined : "pending";
  } else {
    input.patientId = form.patientId;
    input.practitionerId = form.practitionerId;
    input.source = "hospital_desk";
    input.status = "scheduled";
  }

  return input;
}
