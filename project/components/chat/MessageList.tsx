import MessageBubble from "./MessageBubble";
import { ChatMessage } from "./types";
import { dedupeMessages, messageKey } from "./messageUtils";

export default function MessageList({
  messages,
  currentUserId,
  onMessageSeen,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  onMessageSeen: (id: string) => void;
}) {
  // Guard against duplicate keys from REST + Ably races
  const uniqueMessages = dedupeMessages(messages ?? []);

  if (uniqueMessages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {uniqueMessages.map((message, index) => {
        const senderId = String(message.senderId ?? "");
        const me = String(currentUserId ?? "");
        const id = messageKey(message);
        // Always include index so React keys stay unique even if data is messy
        const key = id ? `${id}-${index}` : `msg-${index}-${senderId}-${message.createdAt}`;

        return (
          <MessageBubble
            key={key}
            message={message}
            isOwn={senderId === me}
            onSeen={() => {
              if (!message.isRead && senderId !== me && id) {
                onMessageSeen(id);
              }
            }}
          />
        );
      })}
    </div>
  );
}
