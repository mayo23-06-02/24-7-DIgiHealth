import { NextResponse } from "next/server";
import { Message } from "@/lib/models/Message";
import { isValidId, toId } from '@/lib/db';

/**
 * Unread badge = number of **chats** (conversations) with at least one unread
 * message for this user — not the raw message count.
 *
 * Example: 12 unread messages from the same doctor → counts as **1**.
 */
export async function GET(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isValidId(userId)) {
      return NextResponse.json({
        unreadCount: 0,
        unreadChats: 0,
        unreadMessages: 0,
      });
    }

    const receiverMatch = { isRead: false, receiverId: userId };

    // One entry per conversation that has unread mail for this user
    const [unreadConversationIds, unreadMessages] = await Promise.all([
      Message.find(receiverMatch).distinct("conversationId"),
      Message.countDocuments(receiverMatch),
    ]);

    const unreadChats = unreadConversationIds.length;

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
