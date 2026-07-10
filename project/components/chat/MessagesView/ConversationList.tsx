"use client";
import React, { useState } from "react";
import {
  BiPlus,
  BiLoaderAlt,
  BiSend,
  BiMessageRoundedDetail,
} from "react-icons/bi";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import ConversationItem from "./ConversationItem";
import { ConversationContact } from "./types";

interface ConversationListProps {
  conversations: ConversationContact[];
  activeId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  onNewChat?: () => void;
  pageTitle: string;
  pageSubtitle: string;
  emptyStateTitle: string;
  emptyStateDesc: string;
  onStartConversation: (contactId: string) => void;
  /** Tailwind classes for mobile/desktop visibility (from parent) */
  className?: string;
  /** Open the currently selected chat (mobile: switch pane without re-fetch) */
  onOpenActiveChat?: () => void;
  hasActiveChat?: boolean;
}

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  isLoading,
  onNewChat,
  pageTitle,
  pageSubtitle,
  emptyStateTitle,
  emptyStateDesc,
  onStartConversation,
  className = "flex w-full md:w-96",
  onOpenActiveChat,
  hasActiveChat = false,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"contacts" | "pending">(
    "contacts",
  );

  const filtered = conversations.filter((c) => {
    const matchSearch = c.contactName
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const tab = c.tab || "contacts";
    return matchSearch && tab === activeTab;
  });

  const activeConversation = conversations.find(
    (c) =>
      c.id?.toString() === activeId?.toString() ||
      c.contactId?.toString() === activeId?.toString(),
  );

  return (
    <div
      className={`border-r border-slate-100 flex-col shrink-0 h-full min-h-0 ${className}`}
    >
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex justify-between items-start mb-4 gap-2">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {pageTitle}
            </h2>
            <p className="text-slate-500 font-medium text-sm">{pageSubtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile: jump back to open conversation */}
            {hasActiveChat && onOpenActiveChat && (
              <button
                type="button"
                onClick={onOpenActiveChat}
                className="md:hidden h-10 px-3 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center gap-1.5 hover:bg-primary/15 transition-all"
                title="Back to conversation"
              >
                <BiMessageRoundedDetail size={18} />
                <span>Chat</span>
              </button>
            )}
            {onNewChat && (
              <button
                type="button"
                onClick={onNewChat}
                className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-105 transition-all"
                title="Start New Chat"
              >
                <BiPlus size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Banner when a chat is open but user is viewing the list on mobile */}
        {hasActiveChat && activeConversation && onOpenActiveChat && (
          <button
            type="button"
            onClick={onOpenActiveChat}
            className="md:hidden w-full mb-3 flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15 text-left hover:bg-primary/10 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <BiMessageRoundedDetail size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary uppercase tracking-wide">
                Open conversation
              </p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {activeConversation.contactName}
              </p>
            </div>
            <span className="text-primary text-sm font-bold shrink-0">Open →</span>
          </button>
        )}

        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          {(["contacts", "pending"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize ${
                activeTab === tab ? "bg-white text-primary" : "text-slate-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <Input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <BiLoaderAlt size={28} className="text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={emptyStateTitle}
              description={emptyStateDesc}
              icon={<BiSend size={28} />}
            />
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isActive={Boolean(
                activeId?.toString() === conv.id?.toString() ||
                  activeId?.toString() === conv.contactId?.toString(),
              )}
              onClick={() => {
                if (conv.isPlaceholder) {
                  onStartConversation(conv.contactId);
                } else {
                  onSelect(conv.id?.toString());
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
