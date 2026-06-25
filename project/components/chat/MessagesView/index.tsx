"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ConversationList from "./ConversationList";
import ChatWindow from "../ChatWindow";
import LiveKitCallPanel from "../LiveKitCallPanel";
import { useConversations } from "./useConversations";
import { ActiveCallInfo } from "../CallButton";
import Card from "../../ui/Card";
import { BiMessageDetail } from "react-icons/bi";
import EmptyState from "../../ui/EmptyState";

interface MessagesViewProps {
  fetchEnrichedContacts: (convs: any[]) => Promise<any[]>;
  pageTitle?: string;
  pageSubtitle?: string;
  emptyStateTitle?: string;
  emptyStateDesc?: string;
  onNewChatClick?: () => void;
}

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
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(
    searchParams.get("chatId"),
  );

  const { conversations, isLoading, fetchConversations, startConversation } =
    useConversations(fetchEnrichedContacts);

  // Sync URL param with active chat ID
  useEffect(() => {
    const chatId = searchParams.get("chatId");
    if (chatId) setActiveChatId(chatId);
  }, [searchParams]);

  const handleChatSelect = (id: string) => {
    setActiveChatId(id);
    router.push(`?chatId=${id}`, { scroll: false });
  };

  const handleCallStart = useCallback(
    (info: ActiveCallInfo) => setActiveCall(info),
    [],
  );
  const handleCallEnd = useCallback(() => setActiveCall(null), []);

  const isActiveChatOpen = activeChatId && !activeChatId.startsWith("new-");

  // Split-screen layout when call is active
  if (activeCall && isActiveChatOpen) {
    return (
      <div className="flex h-[calc(100vh-140px)] overflow-hidden -m-4 lg:-m-8">
        <div className="w-1/1 lg:w-1/2 min-w-0 border-r border-slate-800">
          <LiveKitCallPanel callInfo={activeCall} onEnded={handleCallEnd} />
        </div>
        <div className="w-1/2  hidden lg:block min-w-0 bg-white flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <h3 className="text-lg font-bold text-slate-800">Chat</h3>
            <p className="text-sm text-slate-500">
              {activeCall.participantName}
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <ChatWindow conversationId={activeChatId} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="flex flex-1 overflow-hidden bg-white h-[calc(100vh-140px)] -m-4 lg:-m-8">
      <ConversationList
        conversations={conversations}
        activeId={activeChatId}
        onSelect={handleChatSelect}
        isLoading={isLoading}
        onNewChat={onNewChatClick}
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
        emptyStateTitle={emptyStateTitle}
        emptyStateDesc={emptyStateDesc}
        onStartConversation={startConversation}
      />
      {isActiveChatOpen ? (
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <ChatWindow
            conversationId={activeChatId!}
            onCallStart={handleCallStart}
            onCallEnd={handleCallEnd}
          />
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-slate-50">
          <EmptyState
            title="Encrypted Messaging"
            description="Select a contact to begin a secure clinical session."
            icon={<BiMessageDetail size={48} />}
          />
        </div>
      )}
    </Card>
  );
}
