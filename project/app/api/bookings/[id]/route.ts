import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Consultation } from "@/lib/models/Consultation";
import User from "@/lib/models/User";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import mongoose from "mongoose";
import {
  notifyAppointmentChange,
  notifyBookingEvent,
} from "@/lib/booking/notifications";
import { expireStaleBookingRequests } from "@/lib/booking/expire";

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
    const user = await User.findById(userId).lean();
    if (!user) return null;
    return { userId, role: (user as any).role };
  } catch {
    return null;
  }
}

/**
 * GET /api/bookings/:id
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    await expireStaleBookingRequests();
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const c = await Consultation.findById(id).lean();
    if (!c) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Access control
    const pid = (c as any).patientId?.toString();
    const prid = (c as any).practitionerId?.toString();
    if (
      auth.role === "patient" &&
      pid !== auth.userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      auth.role === "practitioner" &&
      prid !== auth.userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pendingReschedule = (c as any).pendingReschedule;

    return NextResponse.json({
      success: true,
      data: {
        id: (c as any)._id.toString(),
        consultationId: (c as any)._id.toString(),
        patientId: pid,
        practitionerId: prid,
        scheduledStart: (c as any).scheduledStartTime,
        scheduledEnd: (c as any).scheduledEndTime,
        status: (c as any).status,
        type: (c as any).type,
        reason: (c as any).chiefComplaint,
        requestedTo: (c as any).requestedTo?.toString(),
        pendingReschedule: pendingReschedule
          ? {
              proposedStart: pendingReschedule.proposedStart,
              proposedEnd: pendingReschedule.proposedEnd,
              proposedByMe:
                pendingReschedule.proposedBy?.toString() === auth.userId,
            }
          : null,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/bookings/:id
 * Reschedule, update reason/type, or change status (accept/cancel/complete).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const c = await Consultation.findById(id);
    if (!c) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const pid = c.patientId.toString();
    const prid = c.practitionerId.toString();
    const isParty =
      auth.userId === pid ||
      auth.userId === prid ||
      auth.role === "hospital_admin" ||
      auth.role === "super_admin" ||
      auth.role === "mega_admin";

    if (!isParty) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Accept/decline a pending reschedule proposal ──────────────────
    if (body.acceptReschedule === true || body.declineReschedule === true) {
      const pending = c.pendingReschedule;
      if (!pending) {
        return NextResponse.json(
          { success: false, error: "No pending reschedule to respond to." },
          { status: 400 },
        );
      }
      if (pending.proposedBy.toString() === auth.userId) {
        return NextResponse.json(
          {
            success: false,
            error: "You proposed this time — waiting on the other party.",
          },
          { status: 403 },
        );
      }

      if (body.acceptReschedule === true) {
        c.scheduledStartTime = pending.proposedStart;
        c.scheduledEndTime = pending.proposedEnd;
        c.pendingReschedule = undefined;
        c.requestedTo = undefined;
        await c.save();

        await notifyBookingEvent("reschedule_accepted", {
          consultationId: c._id,
          patientId: c.patientId,
          practitionerId: c.practitionerId,
          scheduledStart: c.scheduledStartTime,
          type: c.type,
          actorUserId: auth.userId,
        });
      } else {
        const proposedStart = pending.proposedStart;
        c.pendingReschedule = undefined;
        await c.save();

        await notifyBookingEvent("reschedule_declined", {
          consultationId: c._id,
          patientId: c.patientId,
          practitionerId: c.practitionerId,
          scheduledStart: proposedStart,
          type: c.type,
          actorUserId: auth.userId,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: c._id.toString(),
          consultationId: c._id.toString(),
          patientId: c.patientId.toString(),
          practitionerId: c.practitionerId.toString(),
          scheduledStart: c.scheduledStartTime,
          scheduledEnd: c.scheduledEndTime,
          status: c.status,
          type: c.type,
          reason: c.chiefComplaint,
          pendingReschedule: null,
        },
      });
    }

    // ── Rescheduling a confirmed appointment requires the other party's
    // acceptance — store it as a proposal instead of applying it directly.
    if (body.scheduledStart && c.status === "scheduled") {
      const proposedStart = new Date(body.scheduledStart);
      if (Number.isNaN(proposedStart.getTime())) {
        return NextResponse.json(
          { success: false, error: "Invalid date" },
          { status: 400 },
        );
      }
      let proposedEnd: Date;
      if (body.scheduledEnd && !Number.isNaN(new Date(body.scheduledEnd).getTime())) {
        proposedEnd = new Date(body.scheduledEnd);
      } else {
        const durationMs =
          (c.scheduledEndTime
            ? c.scheduledEndTime.getTime()
            : c.scheduledStartTime.getTime() + 30 * 60000) -
          c.scheduledStartTime.getTime();
        proposedEnd = new Date(
          proposedStart.getTime() + (durationMs > 0 ? durationMs : 30 * 60000),
        );
      }

      const conflict = await Consultation.findOne({
        _id: { $ne: c._id },
        practitionerId: c.practitionerId,
        status: { $in: ["requested", "pending", "scheduled", "in_progress"] },
        scheduledStartTime: { $lt: proposedEnd },
        scheduledEndTime: { $gt: proposedStart },
      }).lean();
      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error:
              "That time conflicts with another appointment. Choose a free slot.",
          },
          { status: 409 },
        );
      }

      if (body.type) c.type = body.type;
      if (body.reason || body.chiefComplaint) {
        c.chiefComplaint = body.reason || body.chiefComplaint;
      }
      c.pendingReschedule = {
        proposedStart,
        proposedEnd,
        proposedBy: new mongoose.Types.ObjectId(auth.userId),
        proposedAt: new Date(),
      };
      await c.save();

      await notifyBookingEvent("reschedule_requested", {
        consultationId: c._id,
        patientId: c.patientId,
        practitionerId: c.practitionerId,
        scheduledStart: proposedStart,
        proposedEnd,
        reason: c.chiefComplaint,
        type: c.type,
        actorUserId: auth.userId,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: c._id.toString(),
          consultationId: c._id.toString(),
          patientId: c.patientId.toString(),
          practitionerId: c.practitionerId.toString(),
          scheduledStart: c.scheduledStartTime,
          scheduledEnd: c.scheduledEndTime,
          status: c.status,
          type: c.type,
          reason: c.chiefComplaint,
          pendingReschedule: {
            proposedStart,
            proposedEnd,
            proposedByMe: true,
          },
        },
      });
    }

    const before = {
      status: c.status,
      scheduledStart: c.scheduledStartTime,
      scheduledEnd: c.scheduledEndTime,
      chiefComplaint: c.chiefComplaint,
      type: c.type,
    };
    const prevStart = c.scheduledStartTime?.getTime?.() ?? 0;

    if (body.scheduledStart) {
      const start = new Date(body.scheduledStart);
      if (!Number.isNaN(start.getTime())) {
        c.scheduledStartTime = start;
      }
      if (c.status === "requested" || c.status === "pending") {
        c.requestedTo = auth.userId === pid ? c.practitionerId : c.patientId;
      }
    }
    if (body.scheduledEnd) {
      const end = new Date(body.scheduledEnd);
      if (!Number.isNaN(end.getTime())) c.scheduledEndTime = end;
    }
    // If only start moved, keep duration when end omitted
    if (body.scheduledStart && !body.scheduledEnd && c.scheduledStartTime) {
      const durationMs =
        (before.scheduledEnd
          ? new Date(before.scheduledEnd).getTime()
          : prevStart + 30 * 60000) - prevStart;
      if (durationMs > 0) {
        c.scheduledEndTime = new Date(
          c.scheduledStartTime.getTime() + durationMs,
        );
      }
    }

    // Conflict check when rescheduling — exclude this consultation
    if (body.scheduledStart && c.scheduledStartTime && c.scheduledEndTime) {
      const conflict = await Consultation.findOne({
        _id: { $ne: c._id },
        practitionerId: c.practitionerId,
        status: { $in: ["requested", "pending", "scheduled", "in_progress"] },
        scheduledStartTime: { $lt: c.scheduledEndTime },
        scheduledEndTime: { $gt: c.scheduledStartTime },
      }).lean();
      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error:
              "That time conflicts with another appointment. Choose a free slot.",
          },
          { status: 409 },
        );
      }
    }
    if (body.type) c.type = body.type;
    if (body.reason || body.chiefComplaint) {
      c.chiefComplaint = body.reason || body.chiefComplaint;
    }
    if (body.status) {
      const allowed = [
        "requested",
        "pending",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "missed",
      ];
      if (!allowed.includes(body.status)) {
        // ignore invalid
      } else if (
        (c.status === "requested" || c.status === "pending") &&
        body.status === "scheduled"
      ) {
        const isAllowedToAccept = c.requestedTo
          ? c.requestedTo.toString() === auth.userId
          : auth.userId !== pid;
        if (!isAllowedToAccept) {
          return NextResponse.json(
            {
              success: false,
              error:
                "You cannot accept this request. Please wait for the other party, or reschedule / cancel instead.",
            },
            { status: 403 },
          );
        }
        c.status = body.status;
        c.requestedTo = undefined;
      } else {
        c.status = body.status;
        if (body.status === "cancelled" || body.status === "completed") {
          c.requestedTo = undefined;
        }
      }
    }

    await c.save();

    // Notify the *other* party of any meaningful change
    await notifyAppointmentChange({
      before,
      after: {
        _id: c._id,
        patientId: c.patientId,
        practitionerId: c.practitionerId,
        status: c.status,
        scheduledStartTime: c.scheduledStartTime,
        scheduledEndTime: c.scheduledEndTime,
        chiefComplaint: c.chiefComplaint,
        type: c.type,
      },
      actorUserId: auth.userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: c._id.toString(),
        consultationId: c._id.toString(),
        patientId: c.patientId.toString(),
        practitionerId: c.practitionerId.toString(),
        scheduledStart: c.scheduledStartTime,
        scheduledEnd: c.scheduledEndTime,
        status: c.status,
        type: c.type,
        reason: c.chiefComplaint,
        pendingReschedule: null,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Update failed",
      },
      { status: 500 },
    );
  }
}
