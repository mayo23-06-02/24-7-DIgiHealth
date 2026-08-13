"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { ConversationContact } from "./types";
export type { ConversationContact } from "./types";
import { useSearchParams, useRouter } from "next/navigation";
import ConversationList from "./ConversationList";
import { useConversations } from "./useConversations";
import Card from "../../ui/Card";
import { BiMessageDetail, BiLoaderAlt } from "react-icons/bi";
import EmptyState from "../../ui/EmptyState";
import { useCall } from "@/components/context/CallContext";
import { Conversation, CallInfo } from "../types";

// Heavy chat/call UI — load only when needed (faster initial messages page)
const ChatWindow = dynamic(() => import("../ChatWindow"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <BiLoaderAlt className="animate-spin text-3xl text-primary" />
    </div>
  ),
});
const LiveKitCallPanel = dynamic(() => import("../LiveKitCallPanel"), {
  ssr: false,
});

interface MessagesViewProps {
  fetchEnrichedContacts: (convs: Conversation[]) => Promise<ConversationContact[]>;
  pageTitle?: string;
  pageSubtitle?: string;
  emptyStateTitle?: string;
  emptyStateDesc?: string;
  onNewChatClick?: () => void;
}

/** Mobile: toggle between conversation list and active chat */
type MobilePane = "list" | "chat";

export default function MessagesView({
  fetchEnrichedContacts,
  pageTitle = "Secure Messages",
  pageSubtitle = "Stay connected with your clinical team.",
  emptyStateTitle = "No Messages",
  emptyStateDesc = "Start a new conversation.",
  onNewChatClick,
}: MessagesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeCall, setActiveCall, clearCall } = useCall();
  const [activeChatId, setActiveChatId] = useState<string | null>(
    searchParams.get("chatId"),
  );
  // On small screens only one pane is visible at a time
  const [mobilePane, setMobilePane] = useState<MobilePane>(
    searchParams.get("chatId") ? "chat" : "list",
  );

  const { conversations, isLoading, fetchConversations, startConversation } =
    useConversations(fetchEnrichedContacts);

  const [openingContact, setOpeningContact] = useState(false);
  /** Avoid re-opening the same doctor/patient deep-link in a loop */
  const openedContactRef = useRef<string | null>(null);

  const openConversationById = useCallback(
    (id: string, replace = false) => {
      setActiveChatId(id);
      setMobilePane("chat");
      const url = `?chatId=${id}`;
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router],
  );

  // Sync URL chatId → open that thread
  useEffect(() => {
    const chatId = searchParams.get("chatId");
    if (chatId) {
      setActiveChatId(chatId);
      setMobilePane("chat");
    }
  }, [searchParams]);

  /**
   * Deep-link from Doctors (or elsewhere):
   *   /messages?doctorId=...  |  ?patientId=...  |  ?contactId=...  |  ?patient=...
   * Find or create the conversation and open the chat view (not just the list).
   */
  useEffect(() => {
    const chatId = searchParams.get("chatId");
    if (chatId) return;

    const contactId =
      searchParams.get("doctorId") ||
      searchParams.get("patientId") ||
      searchParams.get("contactId") ||
      searchParams.get("patient");

    if (!contactId) return;
    if (openedContactRef.current === contactId) return;

    let cancelled = false;
    openedContactRef.current = contactId;
    setOpeningContact(true);

    void (async () => {
      try {
        // Prefer an existing thread from the loaded list
        const list =
          conversations.length > 0
            ? conversations
            : (await fetchConversations()) || [];

        if (cancelled) return;

        const existing = list.find(
          (c) =>
            String(c.contactId) === String(contactId) ||
            String(c.practitionerId) === String(contactId) ||
            String(c.id) === String(contactId),
        );

        if (existing?.id && !String(existing.id).startsWith("new-")) {
          openConversationById(String(existing.id), true);
          return;
        }

        // Create or fetch conversation for this contact
        const conversationId = await startConversation(contactId);
        if (cancelled) return;
        if (conversationId) {
          openConversationById(String(conversationId), true);
        } else {
          // Allow retry if create failed
          openedContactRef.current = null;
        }
      } catch {
        openedContactRef.current = null;
      } finally {
        if (!cancelled) setOpeningContact(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only re-run when deep-link target changes, not on every poll of conversations
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, startConversation, fetchConversations, openConversationById]);

  const handleChatSelect = (id: string) => {
    openConversationById(id, false);
  };

  const handleBackToList = useCallback(() => {
    setMobilePane("list");
  }, []);

  const handleStartConversation = useCallback(
    async (contactId: string) => {
      const conversationId = await startConversation(contactId);
      if (conversationId) {
        openConversationById(String(conversationId), false);
      }
    },
    [startConversation, openConversationById],
  );

  const handleCallStart = useCallback(
    (info: CallInfo) => setActiveCall(info),
    [setActiveCall],
  );
  const handleCallEnd = useCallback(() => clearCall(), [clearCall]);

  const isActiveChatOpen = Boolean(
    activeChatId && !activeChatId.startsWith("new-"),
  );

  // Auto-start video call when navigating from appointments with ?join=video
  const joinParam = searchParams.get("join");
  const hasAutoStartedRef = useRef(false);

  useEffect(() => {
    if (
      joinParam !== "video" ||
      !activeChatId ||
      activeCall ||
      hasAutoStartedRef.current
    )
      return;
    hasAutoStartedRef.current = true;
    const conv = conversations.find((c) => c.id === activeChatId);
    fetch("/api/chat/call/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeChatId, type: "video" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.roomUrl) {
          setActiveCall({
            roomUrl: data.roomUrl,
            roomName: data.roomName,
            token: data.token,
            callId: data.callId,
            type: "video",
            initiatedBy: data.initiatedBy,
            participantName: conv?.contactName,
            participantAvatar: conv?.avatar,
          });
          router.replace(`?chatId=${activeChatId}`, { scroll: false });
        } else {
          hasAutoStartedRef.current = false;
        }
      })
      .catch(() => {
        hasAutoStartedRef.current = false;
      });
  }, [
    joinParam,
    activeChatId,
    activeCall,
    conversations,
    setActiveCall,
    router,
  ]);

  // Video call fills the main content area; voice call gets split-screen on large screens
  if (activeCall) {
    if (activeCall.type === "video") {
      return (
        <div className="flex flex-col h-[calc(100dvh-64px)] -m-2 lg:-m-8 bg-slate-900 overflow-hidden">
          <LiveKitCallPanel callInfo={activeCall} onEnded={handleCallEnd} />
        </div>
      );
    }
    return (
      <div className="flex h-[calc(100dvh-64px)] overflow-hidden -m-2 lg:-m-8">
        <div className="w-full lg:w-1/2 min-w-0 border-r border-slate-800">
          <LiveKitCallPanel callInfo={activeCall} onEnded={handleCallEnd} />
        </div>
        <div className="w-1/2 hidden lg:flex min-w-0 bg-white flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <h3 className="text-lg font-bold text-slate-800">Chat</h3>
            <p className="text-sm text-slate-500">
              {activeCall.participantName}
            </p>
          </div>
          <div className="flex-1 min-h-0">
            {isActiveChatOpen ? (
              <ChatWindow conversationId={activeChatId!} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                Select a conversation to chat during the call
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mobile: list when pane=list OR no chat selected; chat when pane=chat and chat open
  // Desktop (md+): always show both (list + chat/empty)
  const showListOnMobile = !isActiveChatOpen || mobilePane === "list";
  const showChatOnMobile = isActiveChatOpen && mobilePane === "chat";

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card
        noPadding
        className="flex overflow-hidden h-[calc(100dvh-80px)] lg:h-[calc(100dvh-128px)]"
      >
        <ConversationList
          conversations={conversations}
          activeId={activeChatId}
          onSelect={handleChatSelect}
          isLoading={isLoading || openingContact}
          onNewChat={onNewChatClick}
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
          emptyStateTitle={emptyStateTitle}
          emptyStateDesc={emptyStateDesc}
          onStartConversation={handleStartConversation}
          className={
            showListOnMobile
              ? "flex w-full md:w-96"
              : "hidden md:flex md:w-96"
          }
          // Mobile shortcut: jump back into open chat without re-selecting
          onOpenActiveChat={
            isActiveChatOpen
              ? () => setMobilePane("chat")
              : undefined
          }
          hasActiveChat={isActiveChatOpen}
        />

        {isActiveChatOpen ? (
          <div
            className={`flex-1 flex-col relative overflow-hidden min-w-0 ${
              showChatOnMobile ? "flex" : "hidden md:flex"
            }`}
          >
            <ChatWindow
              conversationId={activeChatId!}
              onCallStart={handleCallStart}
              onCallEnd={handleCallEnd}
              onBack={handleBackToList}
            />
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center bg-slate-50">
            {openingContact ? (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium">Opening conversation…</p>
              </div>
            ) : (
              <EmptyState
                title="Encrypted Messaging"
                description="Select a contact to begin a secure clinical session."
                icon={<BiMessageDetail size={48} />}
              />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
