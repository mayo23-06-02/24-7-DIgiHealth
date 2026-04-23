"use client";

import React, { useState, useEffect, useCallback } from "react";
import Avatar from "@/components/ui/Avatar";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import {
  BiSend,
  BiWifiOff,
  BiLoaderAlt,
  BiMessageDetail,
  BiPlus,
  BiMicrophone,
  BiMicrophoneOff,
  BiVideo,
  BiVideoOff,
  BiPhoneOff,
  BiExpand,
  BiPhone,
} from "react-icons/bi";
import ChatWindow from "@/components/chat/ChatWindow";
import { ActiveCallInfo } from "@/components/chat/CallButton";
import { useSearchParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";

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

// ─── INLINE VIDEO / VOICE PANEL ───────────────────────────────────────────────
function InlineCallPanel({
  callInfo,
  onEnd,
}: {
  callInfo: ActiveCallInfo;
  onEnd: () => void;
}) {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(callInfo.type === "video");
  const [swapped, setSwapped] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="h-full rounded-l-lg flex flex-col  bg-slate-400 relative overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-5  flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white text">
            {callInfo.type === "video" ? "Video" : "Voice"} Consultation
          </span>
        </div>
        <div className="bg-primary backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <span className="text-white text-xs font-bold tabular-nums">
            {fmt(elapsed)}
          </span>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Full-screen participant */}
        <div className="absolute inset-0 bg-slate-300">
          {callInfo.type === "video" && !swapped ? (
            callInfo.participantAvatar ? (
              <>
                <img
                  src={callInfo.participantAvatar}
                  alt={callInfo.participantName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 " />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Avatar name={callInfo.participantName || "?"} size="xl" />
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {videoOn ? (
                <div className="text-white/10 flex flex-col items-center gap-3">
                  <BiVideo size={80} />
                  <span className="text-xs font-bold  tracking-widest">
                    Your Camera
                  </span>
                </div>
              ) : (
                <Avatar name="You" size="2xl" />
              )}
            </div>
          )}
        </div>

        {/* Participant label */}
        <div className="absolute bottom-4 left-5 z-10">
          <div className="flex items-center py-2 gap-3 bg-primary backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white text-xs font-bold tracking-tight">
              {swapped
                ? "Your Camera"
                : callInfo.participantName || "Participant"}
            </span>
          </div>
        </div>

        {/* PiP (mini) view */}
        <div
          onClick={() => setSwapped(!swapped)}
          className="absolute top-20 right-4 w-48 h-72 rounded-2xl overflow-hidden  cursor-pointer hover:scale-105 hover:border-primary transition-all duration-300 group "
        >
          {swapped && callInfo.participantAvatar ? (
            <>
              <img
                src={callInfo.participantAvatar}
                alt={callInfo.participantName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all" />
            </>
          ) : (
            <div className="w-full h-full bg-slate-700 flex items-center justify-center">
              <BiVideo size={20} className="text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20">
            <BiExpand size={16} className="text-white" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 bg-primary border-t border-white/5 flex items-center justify-center gap-4 shrink-0">
        <button
          onClick={() => setMicOn(!micOn)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white"}`}
        >
          {micOn ? <BiMicrophone size={20} /> : <BiMicrophoneOff size={20} />}
        </button>

        {callInfo.type === "video" && (
          <button
            onClick={() => setVideoOn(!videoOn)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${videoOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white"}`}
          >
            {videoOn ? <BiVideo size={20} /> : <BiVideoOff size={20} />}
          </button>
        )}

        <button
          onClick={onEnd}
          className="w-16 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-rose-900/30"
        >
          <BiPhoneOff size={22} />
        </button>

        <button
          onClick={() => setSwapped(!swapped)}
          className="w-12 h-12 rounded-2xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
          title="Swap View"
        >
          <BiExpand size={20} />
        </button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
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

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/conversations");
      let convData: any[] = [];
      if (res.ok) convData = await res.json();

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
    } catch {
      /* silent */
    }
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
  }, [fetchConversations]);

  const isActiveChatOpen =
    activeChatId &&
    !activeChatId.startsWith("new-") &&
    !activeChatId.startsWith("pending-");

  // ── SPLIT-VIEW LAYOUT (call active) ──────────────────────────────────────
  if (activeCall && isActiveChatOpen) {
    return (
      <div className="flex h-[calc(100vh-140px)] overflow-hidden -m-4 lg:-m-8 animate-in fade-in duration-300">
        {isOffline && (
          <div className="absolute top-0 inset-x-0 z-50 bg-amber-500 text-white p-2 text-center text-xs font-bold flex items-center justify-center gap-2">
            <BiWifiOff size={14} /> Connection lost.
          </div>
        )}

        {/* Video Panel — 65% */}
        <div className="flex-[65] min-w-0 border-r border-slate-800">
          <InlineCallPanel
            callInfo={activeCall}
            onEnd={() => setActiveCall(null)}
          />
        </div>

        {/* Chat Panel — 35% */}
        <div className="flex-[35] min-w-0 flex flex-col bg-white">
          {/* Chat panel header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0 flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <BiMessageDetail size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-none font-grotesk">
                Chat
              </h3>
              <p className="text-[10px] text-slate-400 font-bold  tracking-widest mt-0.5">
                {activeCall.participantName || "Participant"}
              </p>
            </div>
          </div>

          {/* Chat window fills remaining space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatWindow
              conversationId={activeChatId!}
              onCallEnd={() => setActiveCall(null)}
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
        <div className="bg-amber-500 text-white p-2 text-center text-xs font-bold  tracking-normal flex items-center justify-center gap-2">
          <BiWifiOff size={16} /> Connection lost. Messages will queue and send
          when online.
        </div>
      )}

      <Card className="flex flex-1 overflow-hidden bg-white rounded-none border-none shadow-none">
        {/* CONVERSATION LIST */}
        <div
          className={`w-full md:w-96 border-r border-slate-100 flex-col shrink-0 ${isActiveChatOpen ? "hidden md:flex" : "flex"}`}
        >
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-grotesk">
                  {pageTitle}
                </h2>
                <p className="text-slate-500 font-medium text-xs">
                  {pageSubtitle}
                </p>
              </div>
              {onNewChatClick && (
                <button
                  onClick={onNewChatClick}
                  className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-primary/20"
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
                  className={`flex-1 py-2 text-xs  tracking-normal font-bold rounded-lg transition-all capitalize ${activeTab === tab ? "bg-white text-primary shadow-sm" : "text-slate-400"}`}
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
                        <h4 className="font-bold text-slate-800 text-sm truncate pr-2 font-grotesk">
                          {conv.contactName}
                        </h4>
                        <span className="text-xs text-slate-400 font-bold whitespace-nowrap">
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
                          <span className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
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
              onCallStart={(info) => setActiveCall(info)}
              onCallEnd={() => setActiveCall(null)}
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
