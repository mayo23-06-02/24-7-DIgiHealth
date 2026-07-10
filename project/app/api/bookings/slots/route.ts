import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Consultation } from "@/lib/models/Consultation";
import { PractitionerSchedule } from "@/lib/models/Scheduling";
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
 *   &excludeBookingId=...   (optional, when editing)
 *
 * Returns 8am–midnight slots with status: available | past | booked | unavailable
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

    const dayStart = combineLocalDateTime(date, "00:00");
    const dayEnd = combineLocalDateTime(date, "23:59");
    // Expand day bounds slightly for UTC storage drift
    const rangeStart = new Date(dayStart.getTime() - 12 * 60 * 60 * 1000);
    const rangeEnd = new Date(dayEnd.getTime() + 12 * 60 * 60 * 1000);

    const [consultations, schedules] = await Promise.all([
      Consultation.find({
        practitionerId: new mongoose.Types.ObjectId(practitionerId),
        status: { $in: ["requested", "pending", "scheduled", "in_progress"] },
        scheduledStartTime: { $lt: rangeEnd },
        scheduledEndTime: { $gt: rangeStart },
      })
        .select("_id scheduledStartTime scheduledEndTime")
        .lean(),
      PractitionerSchedule.find({
        practitionerId: new mongoose.Types.ObjectId(practitionerId),
        date: {
          $gte: dayStart,
          $lte: dayEnd,
        },
      })
        .select("slots date")
        .lean(),
    ]);

    // Also match schedules stored with date-only UTC midnight for that calendar day
    let scheduleWindows:
      | { startTime: string; endTime: string; status?: string }[]
      | undefined;

    if (schedules.length > 0) {
      scheduleWindows = schedules.flatMap(
        (s: any) =>
          (s.slots || []).map((sl: any) => ({
            startTime: sl.startTime,
            endTime: sl.endTime,
            status: sl.status,
          })),
      );
    } else {
      // Fallback: match by local date string comparison on stored dates
      const allForPrac = await PractitionerSchedule.find({
        practitionerId: new mongoose.Types.ObjectId(practitionerId),
        date: {
          $gte: new Date(`${date}T00:00:00.000Z`),
          $lte: new Date(`${date}T23:59:59.999Z`),
        },
      })
        .select("slots")
        .lean();
      if (allForPrac.length > 0) {
        scheduleWindows = allForPrac.flatMap(
          (s: any) =>
            (s.slots || []).map((sl: any) => ({
              startTime: sl.startTime,
              endTime: sl.endTime,
              status: sl.status,
            })),
        );
      }
    }

    const bookings = consultations.map((c: any) => ({
      id: c._id.toString(),
      start: c.scheduledStartTime,
      end: c.scheduledEndTime,
    }));

    const slots = buildScheduleSlots({
      date,
      durationMinutes: durationMinutes || DEFAULT_SLOT_MINUTES,
      bookings,
      // If no schedule row exists, full 8–24 operating day is open (minus past/booked)
      scheduleWindows: scheduleWindows?.length ? scheduleWindows : undefined,
      excludeBookingId,
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
