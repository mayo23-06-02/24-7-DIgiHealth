import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Call } from "@/lib/models/Call";
import { Conversation } from "@/lib/models/Conversation";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { isMongoObjectId } from "@/lib/utils/mongoId";
import { apiError } from "@/lib/api/errors";

/**
 * Whether an ad-hoc call is live in a conversation, for the two people in it.
 *
 * Same reasoning as the consultation-scoped sibling: a signed-in stranger asking
 * about someone else's thread would otherwise be told that those two are on a
 * call right now, and given the room it is running in. Membership of the
 * conversation is what earns the answer.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const currentUser = await getRequestUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;
    if (!isMongoObjectId(conversationId)) {
      return NextResponse.json({ active: false });
    }

    await connectToDatabase();

    const conversation = await Conversation.findById(conversationId)
      .select("patientId practitionerId")
      .lean<{ patientId?: unknown; practitionerId?: unknown } | null>();

    // A conversation that isn't yours reads exactly like one that doesn't
    // exist, so this can't be used to probe for ids.
    const isParticipant =
      !!conversation &&
      (String(conversation.patientId) === currentUser.userId ||
        String(conversation.practitionerId) === currentUser.userId);
    if (!isParticipant) {
      return NextResponse.json({ active: false });
    }

    const activeCall = await Call.findOne({
      conversationId,
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
