import React from "react";

export default function TypingIndicator({
  typingUsers,
}: {
  typingUsers: string[];
}) {
  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 mb-2 animate-in fade-in">
      <div className="bg-slate-200 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-1 w-fit">
        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
      </div>
      <span className="text-xs uppercase font-bold tracking-normal text-slate-400">
        {typingUsers.length === 1
          ? "Typing..."
          : "Several people are typing..."}
      </span>
    </div>
  );
}
