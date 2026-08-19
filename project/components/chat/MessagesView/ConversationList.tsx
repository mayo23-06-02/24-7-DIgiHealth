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
            <h2 className="lg:text-2xl text-lg font-bold text-slate-800 tracking-tight">
              {pageTitle}
            </h2>
            <p className="text-slate-500 font-medium text-sm">{pageSubtitle}</p>
          </div>
        
        </div>

       

        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
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
