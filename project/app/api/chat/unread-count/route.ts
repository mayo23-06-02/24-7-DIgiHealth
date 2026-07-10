import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Message } from "@/lib/models/Message";

/**
 * Unread badge = number of **chats** (conversations) with at least one unread
 * message for this user — not the raw message count.
 *
 * Example: 12 unread messages from the same doctor → counts as **1**.
 */
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({
        unreadCount: 0,
        unreadChats: 0,
        unreadMessages: 0,
      });
    }

    const userOid = new mongoose.Types.ObjectId(userId);

    // Match both ObjectId and legacy string receiverId values
    const receiverMatch = {
      isRead: false,
      $or: [{ receiverId: userOid }, { receiverId: userId }],
    };

    const [agg, unreadMessages] = await Promise.all([
      Message.aggregate<{ _id: mongoose.Types.ObjectId | string }>([
        { $match: receiverMatch },
        // One row per conversation that has unread mail for this user
        { $group: { _id: "$conversationId" } },
      ]),
      Message.countDocuments(receiverMatch),
    ]);

    const unreadChats = agg.filter((row) => row._id != null).length;

    return NextResponse.json({
      // Header badge uses this — chat-level count
      unreadCount: unreadChats,
      unreadChats,
      unreadMessages,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to count unread";
    console.error("Unread Count API Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
