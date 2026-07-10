import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Consultation } from "@/lib/models/Consultation";
import User from "@/lib/models/User";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import mongoose from "mongoose";
import { expireStaleBookingRequests } from "@/lib/booking/expire";
import { notifyBookingEvent } from "@/lib/booking/notifications";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "secret123!",
);

async function getAuthUser(): Promise<{
  userId: string;
  role: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;
    if (!userId) return null;
    const user = await User.findById(userId).lean();
    if (!user) return null;
    return { userId, role: (user as any).role };
  } catch {
    return null;
  }
}

function toRecord(c: any, extras: Record<string, unknown> = {}) {
  return {
    id: c._id.toString(),
    consultationId: c._id.toString(),
    patientId: c.patientId?.toString?.() || c.patientId,
    practitionerId: c.practitionerId?.toString?.() || c.practitionerId,
    facilityId: c.facilityId?.toString?.(),
    scheduledStart: c.scheduledStartTime,
    scheduledEnd: c.scheduledEndTime,
    status: c.status,
    type: c.type,
    reason: c.chiefComplaint,
    source: c.source,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    ...extras,
  };
}

/**
 * GET /api/bookings
 * Unified list of consultations for the authenticated user (role-aware).
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    // Expire unaccepted requests whose start time has passed
    await expireStaleBookingRequests();

    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "all";
    const search = searchParams.get("search") || "";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const patientId = searchParams.get("patientId");
    const practitionerId = searchParams.get("practitionerId");
    const status = searchParams.get("status");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10) || 100,
      200,
    );

    const filter: Record<string, unknown> = {};
    const now = new Date();

    if (auth.role === "patient") {
      filter.patientId = new mongoose.Types.ObjectId(auth.userId);
    } else if (auth.role === "practitioner") {
      filter.practitionerId = new mongoose.Types.ObjectId(auth.userId);
    }
    // hospital_admin / others: no forced party filter unless query provides one

    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      filter.patientId = new mongoose.Types.ObjectId(patientId);
    }
    if (practitionerId && mongoose.Types.ObjectId.isValid(practitionerId)) {
      filter.practitionerId = new mongoose.Types.ObjectId(practitionerId);
    }

    if (status) {
      filter.status = { $in: status.split(",") };
    } else if (tab !== "all") {
      switch (tab) {
        case "upcoming":
          filter.scheduledStartTime = { $gte: now };
          filter.status = { $in: ["scheduled", "in_progress", "pending", "requested"] };
          break;
        case "past":
          filter.scheduledStartTime = { $lt: now };
          filter.status = { $in: ["completed", "cancelled", "missed"] };
          break;
        case "requests":
          filter.status = { $in: ["pending", "requested"] };
          break;
        case "cancelled":
          filter.status = "cancelled";
          break;
      }
    }

    if (from || to) {
      const range: Record<string, Date> = {
        ...((filter.scheduledStartTime as object) || {}),
      } as any;
      if (from) range.$gte = new Date(from);
      if (to) range.$lte = new Date(to);
      filter.scheduledStartTime = range;
    }

    const consultations = await Consultation.find(filter)
      .sort({ scheduledStartTime: tab === "past" ? -1 : 1 })
      .limit(limit)
      .lean();

    const enriched = await Promise.all(
      consultations.map(async (c: any) => {
        const [patient, practitioner] = await Promise.all([
          User.findById(c.patientId, "firstName lastName").lean() as any,
          User.findById(
            c.practitionerId,
            "firstName lastName avatarUrl",
          ).lean() as any,
        ]);

        const patientName = patient
          ? `${patient.firstName} ${patient.lastName}`
          : "Unknown Patient";
        const practitionerName = practitioner
          ? `Dr. ${practitioner.firstName} ${practitioner.lastName}`
          : "Unknown Practitioner";

        if (
          search &&
          !patientName.toLowerCase().includes(search.toLowerCase()) &&
          !practitionerName.toLowerCase().includes(search.toLowerCase())
        ) {
          return null;
        }

        return toRecord(c, {
          patientName,
          practitionerName,
          practitionerAvatar: practitioner?.avatarUrl,
        });
      }),
    );

    return NextResponse.json({
      success: true,
      data: enriched.filter(Boolean),
    });
  } catch (err: unknown) {
    console.error("[GET /api/bookings]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to list bookings",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/bookings
 * Unified create for patient self-serve, practitioner schedule, or hospital desk.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const start = new Date(body.scheduledStart);
    const end = new Date(body.scheduledEnd);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format" },
        { status: 400 },
      );
    }
    if (start.getTime() < Date.now() - 60_000) {
      return NextResponse.json(
        { success: false, error: "Cannot book in the past" },
        { status: 400 },
      );
    }
    if (end <= start) {
      return NextResponse.json(
        { success: false, error: "End time must be after start time" },
        { status: 400 },
      );
    }

    let patientId = body.patientId as string | undefined;
    let practitionerId = body.practitionerId as string | undefined;
    let status = body.status as string | undefined;
    let source = body.source as string | undefined;

    if (auth.role === "patient") {
      patientId = auth.userId;
      if (!practitionerId) {
        return NextResponse.json(
          { success: false, error: "practitionerId is required" },
          { status: 400 },
        );
      }
      status = status || "requested";
      source = source || "patient_self_serve";
    } else if (auth.role === "practitioner") {
      practitionerId = practitionerId || auth.userId;
      if (!patientId) {
        return NextResponse.json(
          { success: false, error: "patientId is required" },
          { status: 400 },
        );
      }
      status = status || "pending";
      source = source || "practitioner_schedule";
    } else {
      // hospital_admin / staff
      if (!patientId || !practitionerId) {
        return NextResponse.json(
          {
            success: false,
            error: "patientId and practitionerId are required",
          },
          { status: 400 },
        );
      }
      status = status || "scheduled";
      source = source || "hospital_desk";
    }

    if (
      !mongoose.Types.ObjectId.isValid(patientId) ||
      !mongoose.Types.ObjectId.isValid(practitionerId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid participant id" },
        { status: 400 },
      );
    }

    // Optional conflict check: overlapping active booking for practitioner
    const conflict = await Consultation.findOne({
      practitionerId,
      status: { $in: ["requested", "pending", "scheduled", "in_progress"] },
      scheduledStartTime: { $lt: end },
      scheduledEndTime: { $gt: start },
    }).lean();

    if (conflict) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This time slot conflicts with an existing appointment for the practitioner.",
        },
        { status: 409 },
      );
    }

    const consultation = await Consultation.create({
      patientId,
      practitionerId,
      facilityId: body.facilityId || undefined,
      type: body.type || "video",
      status,
      scheduledStartTime: start,
      scheduledEndTime: end,
      chiefComplaint: body.reason || body.chiefComplaint || "",
      source,
    });

    const patient = await User.findById(patientId, "firstName lastName").lean();
    const practitioner = await User.findById(
      practitionerId,
      "firstName lastName avatarUrl",
    ).lean();

    // Notify parties (patient confirmation + practitioner request, etc.)
    const reason = body.reason || body.chiefComplaint || "";
    if (status === "requested" || status === "pending") {
      await notifyBookingEvent("request_created", {
        consultationId: consultation._id,
        patientId,
        practitionerId,
        scheduledStart: start,
        reason,
        type: body.type || "video",
        actorUserId: auth.userId,
      });
    } else {
      await notifyBookingEvent("scheduled_created", {
        consultationId: consultation._id,
        patientId,
        practitionerId,
        scheduledStart: start,
        reason,
        type: body.type || "video",
        actorUserId: auth.userId,
      });
    }

    const data = toRecord(consultation.toObject(), {
      patientName: patient
        ? `${(patient as any).firstName} ${(patient as any).lastName}`
        : undefined,
      practitionerName: practitioner
        ? `Dr. ${(practitioner as any).firstName} ${(practitioner as any).lastName}`
        : undefined,
      practitionerAvatar: (practitioner as any)?.avatarUrl,
      source,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/bookings]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Booking failed",
      },
      { status: 500 },
    );
  }
}
