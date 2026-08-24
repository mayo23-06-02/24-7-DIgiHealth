import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Consultation from "@/lib/models/Consultation";
import { Call } from "@/lib/models/Call";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { isMongoObjectId } from "@/lib/utils/mongoId";
import { listLiveKitParticipants } from "@/lib/livekit";

/**
 * Who is actually in the consultation's room right now.
 *
 * Asked by someone who has stepped out and wants to know whether the other
 * party is still waiting for them. LiveKit is the source of truth here rather
 * than Ably presence: it reports occupancy of the room itself, so the answer
 * stays right even where realtime presence is switched off, and it cannot
 * disagree with what the call is doing.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getRequestUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!isMongoObjectId(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await connectToDatabase();
    const consultation = await Consultation.findById(id)
      .select("patientId practitionerId")
      .lean<{ patientId: unknown; practitionerId: unknown } | null>();
    if (!consultation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isParticipant =
      String(consultation.patientId) === currentUser.userId ||
      String(consultation.practitionerId) === currentUser.userId;
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const call = await Call.findOne({ consultationId: id, status: "active" })
      .select("livekitRoomName")
      .lean<{ livekitRoomName?: string } | null>();

    if (!call?.livekitRoomName) {
      return NextResponse.json({ otherInRoom: false, known: true });
    }

    const identities = await listLiveKitParticipants(call.livekitRoomName);
    if (identities === null) {
      // LiveKit didn't answer. Say so rather than reporting an empty room —
      // "nobody is there" and "we couldn't tell" are different answers, and
      // only one of them should make the UI claim the other party has gone.
      return NextResponse.json({ otherInRoom: false, known: false });
    }

    const myIdentity = `${currentUser.role}:${currentUser.userId}`;
    return NextResponse.json({
      otherInRoom: identities.some((identity) => identity !== myIdentity),
      known: true,
    });
  } catch {
    return NextResponse.json({ otherInRoom: false, known: false });
  }
}
