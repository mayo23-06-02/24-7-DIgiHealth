import dbConnect from "../../../lib/dbConnect";
import Message from "../../../models/Message";
import Conversation from "../../../models/Conversation";
import Ably from "ably";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Verify request is from Ably (optional signature verification)
  const body = req.body;

  const { event, data, channel } = body;
  if (event !== "send:message") {
    return res.status(200).end(); // ignore other events
  }

  const { clientId, conversationId, content, type, fileUrl, fileMime, senderId, receiverId } = data;

  await dbConnect();

  // Idempotent message insertion
  const msg = await Message.findOneAndUpdate(
    { clientId },
    {
      $setOnInsert: {
        conversationId,
        senderId,
        receiverId,
        content,
        type,
        fileUrl,
        fileMime,
        createdAt: new Date()
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Update conversation's lastMessage
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: {
      content: msg.content,
      type: msg.type,
      createdAt: msg.createdAt,
      senderId: msg.senderId
    },
    updatedAt: new Date()
  });

  // Now publish the persisted message back to the channel so all clients receive it
  const ably = new Ably.Rest(process.env.ABLY_API_KEY);
  const ablyChannel = ably.channels.get(channel);
  await ablyChannel.publish("new:message", msg);
  // Also send a private acknowledgement to the sender with clientId
  await ablyChannel.publish("message:sent", { ...msg.toObject(), clientId });

  res.status(200).end();
}