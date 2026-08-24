import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Call } from "@/lib/models/Call";
import Consultation from "@/lib/models/Consultation";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { isMongoObjectId } from "@/lib/utils/mongoId";
import { apiError } from "@/lib/api/errors";

/**
 * Whether a scheduled consultation has a live call, for the two people in it.
 *
 * The participant check is the point of this route as much as the answer is.
 * Being signed in is not standing here: the reply says that a named patient is
 * in a consultation with a named practitioner right now, which is health
 * information about someone else, and it also hands over the room the call is
 * running in. Without the check any account on the platform could ask about any
 * consultation id and be told.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ consultationId: string }> },
) {
  try {
    const currentUser = await getRequestUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { consultationId } = await params;
    if (!isMongoObjectId(consultationId)) {
      return NextResponse.json({ active: false });
    }

    await connectToDatabase();

    const consultation = await Consultation.findById(consultationId)
      .select("patientId practitionerId")
      .lean<{ patientId: unknown; practitionerId: unknown } | null>();

    // "No such consultation" and "not yours" deliberately give the same answer.
    // Distinguishing them would turn this into a way to test whether an id
    // exists at all.
    const isParticipant =
      !!consultation &&
      (String(consultation.patientId) === currentUser.userId ||
        String(consultation.practitionerId) === currentUser.userId);
    if (!isParticipant) {
      return NextResponse.json({ active: false });
    }

    const activeCall = await Call.findOne({
      consultationId,
      status: "active",
    }).sort({ startedAt: -1 });

    if (!activeCall) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      type: activeCall.type,
      roomUrl: activeCall.livekitRoomUrl,
      roomName: activeCall.livekitRoomName,
      callId: activeCall._id,
      initiatedBy: activeCall.initiatedBy,
    });
  } catch (error: unknown) {
    return apiError(error, "Call status is unavailable right now.");
  }
}
