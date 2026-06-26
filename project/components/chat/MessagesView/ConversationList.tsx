"use client";
import React, { useState } from "react";
import { BiPlus, BiLoaderAlt, BiSend } from "react-icons/bi";
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
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"contacts" | "pending">(
    "contacts",
  );

  const filtered = conversations.filter((c) => {
    const matchSearch = c.contactName
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchSearch && c.tab === activeTab;
  });

  const isActiveChatOpen =
    activeId &&
    !activeId.startsWith("new-") &&
    !activeId.startsWith("pending-");

  return (
    <div
      className={`w-full md:w-96 border-r border-slate-100 flex-col shrink-0 ${
        isActiveChatOpen ? "hidden md:flex" : "flex"
      }`}
    >
      <div className="pr-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {pageTitle}
            </h2>
            <p className="text-slate-500 font-medium text-sm">{pageSubtitle}</p>
          </div>
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-105 transition-all"
              title="Start New Chat"
            >
              <BiPlus size={24} />
            </button>
          )}
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          {(["contacts", "pending"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
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

      <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                activeId?.includes(conv.contactId),
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
