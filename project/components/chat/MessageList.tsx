import MessageBubble from "./MessageBubble";
import { ChatMessage } from "./types";
import { dedupeMessages, messageKey } from "./messageUtils";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayLabel(dateStr: string | Date) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-2">
      <span className="px-3 py-1 rounded-full bg-slate-200/70 text-slate-600 text-xs font-semibold">
        {label}
      </span>
    </div>
  );
}

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

  let lastDay: Date | null = null;

  return (
    <div className="flex flex-col gap-3">
      {uniqueMessages.map((message, index) => {
        const senderId = String(message.senderId ?? "");
        const me = String(currentUserId ?? "");
        const id = messageKey(message);
        // Always include index so React keys stay unique even if data is messy
        const key = id ? `${id}-${index}` : `msg-${index}-${senderId}-${message.createdAt}`;

        const messageDate = message.createdAt ? new Date(message.createdAt) : null;
        const showDivider =
          messageDate && (!lastDay || !isSameDay(messageDate, lastDay));
        if (messageDate) lastDay = messageDate;

        return (
          <div key={key}>
            {showDivider && messageDate && (
              <DayDivider label={formatDayLabel(messageDate)} />
            )}
            <MessageBubble
              message={message}
              isOwn={senderId === me}
              onSeen={() => {
                if (!message.isRead && senderId !== me && id) {
                  onMessageSeen(id);
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
