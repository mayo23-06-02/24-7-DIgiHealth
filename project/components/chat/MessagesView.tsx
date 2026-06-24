"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Avatar from "@/components/ui/Avatar";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import {
  BiSend,
  BiWifiOff,
  BiLoaderAlt,
  BiMessageDetail,
  BiPlus,
} from "react-icons/bi";
import ChatWindow from "@/components/chat/ChatWindow";
import { ActiveCallInfo } from "@/components/chat/CallButton";
import { useSearchParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import LiveKitCallPanel from "@/components/chat/LiveKitCallPanel";

export interface ConversationContact {
  isPlaceholder?: boolean;
  id: string;
  contactId: string;
  contactName: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
  tab: "contacts" | "pending";
  practitionerId?: string;
}

export interface MessagesViewProps {
  pageTitle?: string;
  pageSubtitle?: string;
  emptyStateTitle?: string;
  emptyStateDesc?: string;
  onNewChatClick?: () => void;
  fetchEnrichedContacts: (
    existingConvs: any[],
  ) => Promise<ConversationContact[]>;
}

export default function MessagesView({
  pageTitle = "Secure Messages",
  pageSubtitle = "Stay connected with your clinical team.",
  emptyStateTitle = "No Messages",
  emptyStateDesc = "Start a new conversation.",
  onNewChatClick,
  fetchEnrichedContacts,
}: MessagesViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(
    searchParams.get("chatId"),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState<"contacts" | "pending">(
    "contacts",
  );
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);

  const handleCallStart = useCallback(
    (info: ActiveCallInfo) => setActiveCall(info),
    [],
  );
  const handleCallEnd = useCallback(() => setActiveCall(null), []);

  const isFirstLoad = useRef(true);
  const fetchConversations = useCallback(async () => {
    if (isFirstLoad.current) setIsLoading(true);
    try {
      const res = await fetch("/api/conversations");
      let convData: any[] = [];
      if (res.ok) {
        convData = await res.json();
        isFirstLoad.current = false;
      }

      const enriched = await fetchEnrichedContacts(convData);
      enriched.forEach((c) => {
        if (!c.tab) c.tab = "contacts";
      });
      setConversations(enriched);
      return enriched;
    } catch (e) {
      console.error("Messaging fetch error:", e);
    } finally {
      setIsLoading(false);
    }
    return [];
  }, [fetchEnrichedContacts]);

  const handleStartConversation = async (contactId: string) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        const cid = data.conversationId;
        setActiveChatId(cid);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("chatId", cid);
        newUrl.searchParams.delete("contactId");
        window.history.replaceState(null, "", newUrl.toString());
      }
    } catch {}
  };

  useEffect(() => {
    fetchConversations().then((data) => {
      const contactParam =
        searchParams.get("contactId") ||
        searchParams.get("doctorId") ||
        searchParams.get("patientId");
      if (contactParam && data) {
        const existing = data.find((c: any) => c.contactId === contactParam);
        if (existing && !existing.isPlaceholder) {
          const cid = existing.id.toString();
          setActiveChatId(cid);
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set("chatId", cid);
          router.replace(newUrl.pathname + newUrl.search, { scroll: false });
        } else {
          handleStartConversation(contactParam);
        }
      }
    });

    // Pause polling while a call is active to avoid re-renders that destabilise LiveKit
    if (activeCall) return;
    const interval = setInterval(fetchConversations, 8000);
    return () => clearInterval(interval);
  }, [fetchConversations, searchParams, router, activeCall]);

  const isActiveChatOpen =
    activeChatId &&
    !activeChatId.startsWith("new-") &&
    !activeChatId.startsWith("pending-");

  // ── SPLIT-VIEW LAYOUT (call active) ──────────────────────────────────────
  if (activeCall && isActiveChatOpen) {
    return (
      <div className="flex h-[calc(100vh-140px)] overflow-hidden -m-4 lg:-m-8 animate-in fade-in duration-300">
        {isOffline && (
          <div className="absolute top-0 inset-x-0 z-50 bg-gray-500 text-white p-2 text-center text-xs font-bold flex items-center justify-center gap-2">
            <BiWifiOff size={14} /> Connection lost.
          </div>
        )}

        {/* Video Panel — 65% */}
        <div className="flex-65 min-w-0 border-r border-slate-800">
          <LiveKitCallPanel
            callInfo={activeCall}
            onEnded={() => setActiveCall(null)}
          />
        </div>

        {/* Chat Panel — 35% */}
        <div className="flex-35 min-w-0 flex flex-col bg-white">
          {/* Chat panel header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0 flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <BiMessageDetail size={16} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-none">
                Chat
              </h3>
              <p className="text-sm text-slate-500 font-bold -widest mt-0.5">
                {activeCall.participantName || "Participant"}
              </p>
            </div>
          </div>

          {/* Chat window fills remaining space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatWindow
              conversationId={activeChatId!}
              onCallEnd={handleCallEnd}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── NORMAL LAYOUT ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden -m-4 lg:-m-8 animate-in fade-in duration-700">
      {isOffline && (
        <div className="bg-gray-500 text-white p-2 text-center text-xs font-bold -normal flex items-center justify-center gap-2">
          <BiWifiOff size={16} /> Connection lost. Messages will queue and send
          when online.
        </div>
      )}

      <Card className="flex flex-1 overflow-hidden bg-white ">
        {/* CONVERSATION LIST */}
        <div
          className={`w-full md:w-96 border-r border-slate-100 flex-col shrink-0 ${isActiveChatOpen ? "hidden md:flex" : "flex"}`}
        >
          <div className="pr-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                  {pageTitle}
                </h2>
                <p className="text-slate-500 font-medium text-sm">
                  {pageSubtitle}
                </p>
              </div>
              {onNewChatClick && (
                <button
                  onClick={onNewChatClick}
                  className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-105 transition-all "
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
                  className={`flex-1 py-2 text-sm -normal  rounded-lg transition-all ${activeTab === tab ? "bg-white text-primary " : "text-slate-500"}`}
                >
                  <h1 className="font-bold">{tab}</h1>
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
            ) : conversations.filter((c) => c.tab === activeTab).length ===
              0 ? (
              <div className="p-6">
                <EmptyState
                  title={emptyStateTitle}
                  description={emptyStateDesc}
                  icon={<BiSend size={28} />}
                />
              </div>
            ) : (
              conversations
                .filter((c) => {
                  const matchSearch = c.contactName
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase());
                  return matchSearch && c.tab === activeTab;
                })
                .map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-4 border-b border-slate-50 cursor-pointer transition-all flex gap-3 hover:bg-slate-50 ${activeChatId?.toString() === conv.id?.toString() || activeChatId?.includes(conv.contactId) ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"}`}
                    onClick={() => {
                      if (conv.isPlaceholder) {
                        handleStartConversation(conv.contactId);
                      } else {
                        const cid = conv.id?.toString();
                        setActiveChatId(cid);
                        const newUrl = new URL(window.location.href);
                        newUrl.searchParams.set("chatId", cid);
                        router.push(newUrl.pathname + newUrl.search, {
                          scroll: false,
                        });
                      }
                    }}
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
                          className={`text-xs line-clamp-1 flex-1 ${conv.unread > 0 ? "text-slate-800 font-bold" : "text-slate-500 font-medium"}`}
                        >
                          {conv.lastMessage}
                        </p>
                        {conv.unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0  shadow-primary/20">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* CHAT WINDOW */}
        {isActiveChatOpen ? (
          <div className="flex-1 flex flex-col  relative overflow-hidden">
            <ChatWindow
              conversationId={activeChatId!}
              onCallStart={handleCallStart}
              onCallEnd={handleCallEnd}
            />
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-slate-50">
            <EmptyState
              title="Encrypted Messaging"
              description="Select a contact to begin a secure clinical session."
              icon={<BiMessageDetail size={48} />}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
