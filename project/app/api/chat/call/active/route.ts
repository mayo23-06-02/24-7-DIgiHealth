import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/lib/mongodb";
import Call from "@/lib/models/Call";
import Conversation from "@/lib/models/Conversation";
import User from "@/lib/models/User";
import { isMongoObjectId } from "@/lib/utils/mongoId";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    await connectToDatabase();

    // Postgres-native accounts have no Mongo identity — Conversation is
    // still Mongo-only, so they can't be a participant in any (see lib/utils/mongoId.ts).
    if (!isMongoObjectId(userId)) return NextResponse.json({ calls: [] });

    // Find all conversations where current user is a participant
    const userConversations = await Conversation.find({
      $or: [{ patientId: userId }, { practitionerId: userId }],
    }).select("_id").lean();
    const conversationIds = userConversations.map((c) => c._id);

    /*
     * Active ad-hoc calls only.
     *
     * A scheduled consultation is joined through
     * POST /api/consultations/[id]/session, where both parties walk into a room
     * that opens on a timetable — there is no caller, so there is nobody to
     * ring. Leaving those rows in this response is what used to ring both
     * participants for the call they were already sitting in.
     */
    const activeCalls = await Call.find({
      conversationId: { $in: conversationIds },
      status: "active",
      $or: [{ consultationId: { $exists: false } }, { consultationId: null }],
    }).lean();

    const calls = await Promise.all(
      activeCalls.map(async (call) => {
        // Look up the conversation to find the other participant
        const conversation = await Conversation.findById(call.conversationId).lean();

        let otherParticipantId: string | null = null;
        if (conversation) {
          const patientId = conversation.patientId.toString();
          const practitionerId = conversation.practitionerId.toString();
          otherParticipantId = patientId === userId ? practitionerId : patientId;
        }

        let participantName = "Participant";
        let participantAvatar: string | undefined;

        if (otherParticipantId) {
          const otherUser = await User.findById(otherParticipantId)
            .select("firstName lastName avatarUrl")
            .lean();
          if (otherUser) {
            participantName = `${otherUser.firstName} ${otherUser.lastName}`;
            participantAvatar = (otherUser as { avatarUrl?: string }).avatarUrl;
          }
        }

        return {
          callId: call._id.toString(),
          roomUrl: call.livekitRoomUrl,
          roomName: call.livekitRoomName,
          type: call.type,
          initiatedBy: call.initiatedBy.toString(),
          participantName,
          participantAvatar,
          conversationId: call.conversationId?.toString(),
          consultationId: call.consultationId?.toString(),
        };
      })
    );

    return NextResponse.json({ calls });
  } catch (error) {
    console.error("Call active endpoint error:", error);
    return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
  }
}