import { NextResponse } from "next/server";
import Message from "@/lib/models/Message";
import { isValidId, toId } from '@/lib/db';

export async function PATCH(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    const { messageId, conversationId } = await req.json();

    const userOid =
      userId && isValidId(userId)
        ? (toId(userId) as string)
        : null;

    let modified = 0;

    if (messageId) {
      if (!isValidId(messageId)) {
        return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
      }

      const filter: Record<string, unknown> = {
        _id: (toId(messageId) as string),
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
      if (!isValidId(conversationId)) {
        return NextResponse.json(
          { error: "Invalid conversation ID" },
          { status: 400 },
        );
      }

      const convOid = (toId(conversationId) as string);

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
