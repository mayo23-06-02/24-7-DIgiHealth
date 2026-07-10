import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Consultation } from "@/lib/models/Consultation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { notifyBookingEvent } from "@/lib/booking/notifications";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Accept an appointment request.
 * Only the assigned **practitioner** may accept.
 * Patients who submitted the request can reschedule or cancel — not accept.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 },
      );
    }

    const isPractitioner =
      consultation.practitionerId.toString() === userId;
    const isPatient = consultation.patientId.toString() === userId;

    if (isPatient && !isPractitioner) {
      return NextResponse.json(
        {
          error:
            "You cannot accept an appointment you requested. Please wait for the practitioner, or reschedule / cancel instead.",
        },
        { status: 403 },
      );
    }

    if (!isPractitioner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      consultation.status !== "requested" &&
      consultation.status !== "pending"
    ) {
      return NextResponse.json(
        {
          error: `Cannot accept a consultation with status "${consultation.status}".`,
        },
        { status: 400 },
      );
    }

    consultation.status = "scheduled";
    await consultation.save();

    await notifyBookingEvent("accepted", {
      consultationId: consultation._id,
      patientId: consultation.patientId,
      practitionerId: consultation.practitionerId,
      scheduledStart: consultation.scheduledStartTime,
      reason: consultation.chiefComplaint,
      type: consultation.type,
      actorUserId: userId,
    });

    return NextResponse.json({
      success: true,
      consultation,
    });
  } catch (error) {
    console.error("Approve API Error:", error);
    return NextResponse.json(
      { error: "Failed to approve consultation" },
      { status: 500 },
    );
  }
}
