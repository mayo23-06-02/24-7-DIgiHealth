import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Call } from "@/lib/models/Call";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ consultationId: string }> },
) {
  try {
    const { consultationId } = await params;
    await connectToDatabase();

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
    const message =
      error instanceof Error ? error.message : "Failed to load call status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
