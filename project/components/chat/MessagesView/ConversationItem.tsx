"use client";
import React from "react";
import Avatar from "@/components/ui/Avatar";
import { ConversationContact } from "./types";

export default function ConversationItem({
  conv,
  isActive,
  onClick,
}: {
  conv: ConversationContact;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`p-4 border-b border-slate-50 cursor-pointer transition-all flex gap-3 hover:bg-slate-50 ${
        isActive
          ? "bg-primary/5 border-l-4 border-l-primary"
          : "border-l-4 border-l-transparent"
      }`}
      onClick={onClick}
    >
      <Avatar
        name={conv.contactName}
        src={conv.avatar}
        size="md"
        status={conv.online ? "online" : "offline"}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-center mb-0.5">
          <h4 className="font-bold text-slate-800 text-sm truncate pr-2">
            {conv.contactName}
          </h4>
          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">
            {conv.timestamp || ""}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <p
            className={`text-xs line-clamp-1 flex-1 ${
              conv.unread > 0
                ? "text-slate-800 font-bold"
                : "text-slate-500 font-medium"
            }`}
          >
            {conv.lastMessage}
          </p>
          {conv.unread > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-primary/20">
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
