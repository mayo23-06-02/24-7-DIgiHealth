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
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const practitionerId = searchParams.get("practitionerId");
    const date = searchParams.get("date");
    const durationMinutes = parseInt(
      searchParams.get("durationMinutes") || String(DEFAULT_SLOT_MINUTES),
      10,
    );
    const excludeBookingId = searchParams.get("excludeBookingId");

    if (!practitionerId || !date) {
      return NextResponse.json(
        { error: "practitionerId and date are required" },
        { status: 400 },
      );
    }
    if (!mongoose.Types.ObjectId.isValid(practitionerId)) {
      return NextResponse.json(
        { error: "Invalid practitionerId" },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date must be YYYY-MM-DD" },
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
