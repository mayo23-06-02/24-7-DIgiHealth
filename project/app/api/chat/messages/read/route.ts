import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Message from "@/lib/models/Message";

export async function PATCH(req: Request) {
  try {
    await connectToDatabase();
    const userId = req.headers.get("x-user-id");
    const { messageId, conversationId } = await req.json();

    const userOid =
      userId && mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : null;

    let modified = 0;

    if (messageId) {
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
      }

      const filter: Record<string, unknown> = {
        _id: new mongoose.Types.ObjectId(messageId),
        isRead: false,
      };
      if (userOid) {
        filter.$or = [{ receiverId: userOid }, { receiverId: userId }];
      }

      const result = await Message.updateMany(filter, {
        $set: { isRead: true, readAt: new Date() },
      });
      modified = result.modifiedCount;
    } else if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return NextResponse.json(
          { error: "Invalid conversation ID" },
          { status: 400 },
        );
      }

      const convOid = new mongoose.Types.ObjectId(conversationId);

      // $and so conversation + receiver $or clauses don't clobber each other
      const andClauses: Record<string, unknown>[] = [
        { isRead: false },
        {
          $or: [
            { conversationId: convOid },
            { conversationId: conversationId },
          ],
        },
      ];
      if (userOid) {
        andClauses.push({
          $or: [{ receiverId: userOid }, { receiverId: userId }],
        });
      }

      const result = await Message.updateMany(
        { $and: andClauses },
        { $set: { isRead: true, readAt: new Date() } },
      );
      modified = result.modifiedCount;
    } else {
      return NextResponse.json(
        { error: "messageId or conversationId required" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, modified });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to mark as read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
