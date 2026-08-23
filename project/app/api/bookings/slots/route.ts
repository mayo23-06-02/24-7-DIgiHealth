import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Consultation } from "@/lib/models/Consultation";
import {
  buildScheduleSlots,
  combineLocalDateTime,
  DEFAULT_SLOT_MINUTES,
  OPERATING_END_HOUR,
  OPERATING_START_HOUR,
} from "@/lib/booking/slots";
import mongoose from "mongoose";

/**
 * GET /api/bookings/slots
 *   ?practitionerId=...
 *   &date=YYYY-MM-DD
 *   &durationMinutes=30
 *   &excludeBookingId=...   (optional, when editing/rescheduling)
 *
 * Returns 8am–midnight slots with status: available | past | booked | unavailable
 * Booked = real consultations only (schedule "booked" flags are not capacity).
 */
/** Cap on a batch request, so one call can't fan out into an unbounded scan. */
const MAX_BATCH = 25;

/**
 * Batch variant: ?practitionerIds=a,b,c&date=YYYY-MM-DD
 *
 * Added because every doctor card was fetching its own availability — a list
 * of 20 doctors produced 20 round trips (and 20 serverless invocations) to
 * render one screen. This resolves the whole list from a single Consultation
 * query, grouped in memory.
 *
 * Returns { slots: { [practitionerId]: BookingSlot[] } } rather than the
 * single-practitioner shape below; the single form is untouched so the
 * booking modal keeps working exactly as before.
 */
async function handleBatch(ids: string[], date: string, durationMinutes: number) {
  const valid = ids
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .slice(0, MAX_BATCH);

  if (valid.length === 0) {
    return NextResponse.json({ success: true, data: { date, slots: {} } });
  }

  const dayStart = combineLocalDateTime(date, "00:00");
  const dayEnd = combineLocalDateTime(date, "23:59");
  const rangeStart = new Date(dayStart.getTime() - 14 * 60 * 60 * 1000);
  const rangeEnd = new Date(dayEnd.getTime() + 14 * 60 * 60 * 1000);

  // One query for every practitioner in the batch, instead of one each.
  const consultations = await Consultation.find({
    practitionerId: { $in: valid.map((id) => new mongoose.Types.ObjectId(id)) },
    status: { $in: ["requested", "pending", "scheduled", "in_progress"] },
    scheduledStartTime: { $lt: rangeEnd },
    scheduledEndTime: { $gt: rangeStart },
  })
    .select("_id practitionerId scheduledStartTime scheduledEndTime")
    .lean();

  const byPractitioner = new Map<string, { id: string; start: Date; end: Date }[]>();
  for (const c of consultations as any[]) {
    const key = c.practitionerId.toString();
    if (!byPractitioner.has(key)) byPractitioner.set(key, []);
    byPractitioner.get(key)!.push({
      id: c._id.toString(),
      start: c.scheduledStartTime,
      end: c.scheduledEndTime,
    });
  }

  const slots: Record<string, ReturnType<typeof buildScheduleSlots>> = {};
  for (const id of valid) {
    slots[id] = buildScheduleSlots({
      date,
      durationMinutes,
      bookings: byPractitioner.get(id) || [],
    });
  }

  return NextResponse.json({ success: true, data: { date, durationMinutes, slots } });
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const practitionerId = searchParams.get("practitionerId");
    const practitionerIds = searchParams.get("practitionerIds");
    const date = searchParams.get("date");
    const durationMinutes = parseInt(
      searchParams.get("durationMinutes") || String(DEFAULT_SLOT_MINUTES),
      10,
    );
    const excludeBookingId = searchParams.get("excludeBookingId");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }

    if (practitionerIds) {
      return await handleBatch(
        practitionerIds.split(","),
        date,
        durationMinutes || DEFAULT_SLOT_MINUTES,
      );
    }

    if (!practitionerId) {
      return NextResponse.json(
        { error: "practitionerId or practitionerIds is required" },
        { status: 400 },
      );
    }
    if (!mongoose.Types.ObjectId.isValid(practitionerId)) {
      return NextResponse.json(
        { error: "Invalid practitionerId" },
        { status: 400 },
      );
    }
    // Wide range for UTC / SAST storage drift on scheduledStartTime
    const dayStart = combineLocalDateTime(date, "00:00");
    const dayEnd = combineLocalDateTime(date, "23:59");
    const rangeStart = new Date(dayStart.getTime() - 14 * 60 * 60 * 1000);
    const rangeEnd = new Date(dayEnd.getTime() + 14 * 60 * 60 * 1000);

    const consultations = await Consultation.find({
      practitionerId: new mongoose.Types.ObjectId(practitionerId),
      status: { $in: ["requested", "pending", "scheduled", "in_progress"] },
      scheduledStartTime: { $lt: rangeEnd },
      scheduledEndTime: { $gt: rangeStart },
    })
      .select("_id scheduledStartTime scheduledEndTime")
      .lean();


    const bookings = consultations.map((c: any) => ({
      id: c._id.toString(),
      start: c.scheduledStartTime,
      end: c.scheduledEndTime,
    }));


    const slots = buildScheduleSlots({
      date,
      durationMinutes: durationMinutes || DEFAULT_SLOT_MINUTES,
      bookings,
      excludeBookingId: excludeBookingId || null,
    });

    const summary = {
      available: slots.filter((s) => s.status === "available").length,
      past: slots.filter((s) => s.status === "past").length,
      booked: slots.filter((s) => s.status === "booked").length,
      unavailable: slots.filter((s) => s.status === "unavailable").length,
    };

    return NextResponse.json({
      success: true,
      data: {
        date,
        practitionerId,
        operatingHours: {
          start: `${String(OPERATING_START_HOUR).padStart(2, "0")}:00`,
          end: `${String(OPERATING_END_HOUR).padStart(2, "0")}:00`,
        },
        durationMinutes: durationMinutes || DEFAULT_SLOT_MINUTES,
        slots,
        summary,
        excludeBookingId: excludeBookingId || null,
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/bookings/slots]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to load slots",
      },
      { status: 500 },
    );
  }
}
