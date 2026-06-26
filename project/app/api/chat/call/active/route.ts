import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/lib/mongodb";
import Call from "@/lib/models/Call"; // your Call model

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    await connectToDatabase();
    const activeCalls = await Call.find({
      $or: [
        { initiatedBy: userId, status: "active" },
        { recipientId: userId, status: "active" },
      ],
    })
      .populate("initiatedBy", "firstName lastName avatarUrl")
      .populate("recipientId", "firstName lastName avatarUrl")
      .lean();

    const calls = activeCalls.map((call) => {
      const isInitiator = call.initiatedBy._id.toString() === userId;
      const otherParticipant = isInitiator ? call.recipientId : call.initiatedBy;
      return {
        callId: call._id.toString(),
        roomUrl: call.roomUrl,
        roomName: call.roomName,
        type: call.type,
        initiatedBy: call.initiatedBy._id.toString(),
        participantName: otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : "Participant",
        participantAvatar: otherParticipant?.avatarUrl,
        conversationId: call.conversationId,
        consultationId: call.consultationId,
      };
    });

    return NextResponse.json({ calls });
  } catch (error) {
    console.error("Call active endpoint error:", error);
    return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
  }
}