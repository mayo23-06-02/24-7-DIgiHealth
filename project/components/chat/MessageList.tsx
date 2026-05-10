import React from "react";
import MessageBubble from "./MessageBubble";

export default function MessageList({
  messages,
  currentUserId,
  onMessageSeen,
}: {
  messages: any[];
  currentUserId: string;
  onMessageSeen: (id: string) => void;
}) {
  if (!messages || messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((message) => (
        <MessageBubble
          key={message._id || message.id}
          message={message}
          isOwn={message.senderId === currentUserId}
          onSeen={() => {
            if (!message.isRead && message.senderId !== currentUserId) {
              onMessageSeen(message._id);
            }
          }}
        />
      ))}
    </div>
  );
}
