"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuthContext } from "@/components/auth/AuthProvider";
import Link from "next/link";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import QuickPhrases from "./QuickPhrases";
import CallButton, { ActiveCallInfo } from "./CallButton";
import TypingIndicator from "./TypingIndicator";
import OfflineBanner from "./OfflineBanner";
import AttachRecordModal from "./AttachRecordModal";
import { useChat } from "@/hooks/useChat";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { upsertMessage } from "./messageUtils";
import { notifyChatUnreadChanged } from "@/lib/chatUnread";
import { BiLoaderAlt, BiPlus, BiArrowBack } from "react-icons/bi";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";

export default function ChatWindow({
  consultationId: propConsultationId,
  conversationId: propConversationId,
  scheduledAt,
  onCallStart,
  onCallEnd,
  onBack,
}: {
  consultationId?: string;
  conversationId?: string;
  /** ISO string for the scheduled consultation start time — gates call buttons */
  scheduledAt?: string;
  onCallStart?: (info: ActiveCallInfo) => void;
  onCallEnd?: () => void;
  /** Mobile: return to conversation list */
  onBack?: () => void;
} = {}) {
  const params = useParams();
  const consultationId =
    propConsultationId || (params.consultationId as string | undefined);
  const conversationId = propConversationId;
  const chatId = consultationId || conversationId || "";

  const { user } = useAuthContext();

  // Hooks must always run (no early return above this line)
  const {
    messages,
    setMessages,
    sendMessage: restSendMessage,
    conversation,
    loading,
    markAsRead: restMarkAsRead,
    error: chatError,
  } = useChat(chatId, !!conversationId);

  const socketConversationId =
    conversationId || conversation?._id?.toString?.() || conversation?._id || null;

  const {
    typingUsers: socketTypingUsers,
    isConnected,
    sendMessage: socketSendMessage,
    startTyping,
    stopTyping,
    markAsRead: socketMarkAsRead,
  } = useChatSocket(socketConversationId, user?.id || null, {
    onNewMessage: (msg) => {
      setMessages((prev) => upsertMessage(prev, msg));
      if (user?.id && String(msg.senderId) !== String(user.id)) {
        notifyChatUnreadChanged();
      }
    },
    onMessageSent: (msg: any) => {
      setMessages((prev) => upsertMessage(prev, msg));
    },
    onMessageRead: ({ messageId, readAt }) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id ?? m.id) === String(messageId)
            ? { ...m, isRead: true, readAt: new Date(readAt) }
            : m,
        ),
      );
    },
  });

  const { isOffline, queueMessage } = useOfflineQueue();
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [tempIdMap, setTempIdMap] = useState<Map<string, string>>(new Map());
  // Guards against duplicate sends from rapid double-clicks (e.g. quick-phrase
  // buttons) or double-fired Enter/submit events while a send is in flight.
  const sendingRef = useRef(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When doctor attaches a clinical record / prescription from AttachRecordModal
  useEffect(() => {
    const onAttached = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      setMessages((prev) => upsertMessage(prev, detail));
      notifyChatUnreadChanged();
    };
    window.addEventListener("chat:message-attached", onAttached);
    return () =>
      window.removeEventListener("chat:message-attached", onAttached);
  }, [setMessages]);

  const handleSend = useCallback(
    async (
      content: string,
      type = "text",
      fileUrl?: string,
      fileMime?: string,
    ) => {
      if (!content && !fileUrl) return;
      if (!user || !conversation) return;
      // Ignore re-entrant calls fired while a previous send is still in
      // flight (e.g. a user rapid-clicking several quick-phrase buttons in a
      // row) so we don't fire duplicate requests that can trip the
      // send-endpoint rate limiter.
      if (sendingRef.current) return;
      sendingRef.current = true;
      setIsSending(true);

      const clientId = crypto.randomUUID();
      const msg = {
        conversationId: conversation._id,
        senderId: user.id,
        receiverId:
          user.role === "patient"
            ? conversation.practitionerId?._id || conversation.practitionerId
            : conversation.patientId?._id || conversation.patientId,
        content,
        type,
        fileUrl,
        fileMime,
        clientId,
      };

      const optimisticMsg = {
        ...msg,
        _id: clientId,
        clientId,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => upsertMessage(prev, optimisticMsg as any));

      try {
        if (isOffline) {
          await queueMessage(msg);
          setTempIdMap((prev) => new Map(prev).set(clientId, ""));
        } else {
          try {
            const result = await socketSendMessage(msg);
            if (!result.ok) {
              if (result.status === 429) {
                // Don't hammer the same rate-limited endpoint with an
                // immediate retry — just let the user know and let the
                // optimistic message be retried by hand.
                toast.error(
                  "You're sending messages too quickly. Please wait a moment and try again.",
                );
              } else {
                const serverMsg = await restSendMessage(msg);
                if (serverMsg) {
                  setMessages((prev) =>
                    upsertMessage(prev, {
                      ...(serverMsg as any),
                      clientId,
                    }),
                  );
                } else {
                  toast.error("Failed to send message. Please try again.");
                }
              }
            }
          } catch (error) {
            console.error("Failed to send message", error);
            toast.error("Failed to send message. Please try again.");
          }
        }
        stopTyping();
      } finally {
        sendingRef.current = false;
        setIsSending(false);
      }
    },
    [
      user,
      conversation,
      isOffline,
      queueMessage,
      socketSendMessage,
      restSendMessage,
      setMessages,
      stopTyping,
    ],
  );

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">No conversation selected.</p>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-lg h-full">
        <BiLoaderAlt className="animate-spin text-4xl text-primary" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg h-full gap-2 px-6 text-center">
        <p className="text-slate-700 font-medium">
          Unable to load this conversation
        </p>
        <p className="text-sm text-slate-500">
          {chatError || "Conversation not found."}
        </p>
      </div>
    );
  }

  const opponentName =
    user.role === "patient"
      ? conversation.practitionerId?.firstName
        ? `Dr. ${conversation.practitionerId.firstName} ${conversation.practitionerId.lastName}`
        : "Practitioner"
      : conversation.patientId?.firstName
        ? `${conversation.patientId.firstName} ${conversation.patientId.lastName}`
        : "Patient";

  const opponentId =
    user.role === "patient"
      ? conversation.practitionerId?._id || conversation.practitionerId
      : conversation.patientId?._id || conversation.patientId;

  const opponentAvatar =
    user.role === "patient"
      ? conversation.practitionerId?.avatarUrl
      : conversation.patientId?.avatarUrl;

  const linkedConsultation =
    conversation.consultationId &&
    typeof conversation.consultationId === "object"
      ? conversation.consultationId
      : null;

  const startedAtRaw = conversation.startedAt || conversation.createdAt;
  const startedLabel = startedAtRaw
    ? `Started ${new Date(startedAtRaw).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-none">
      <div className="flex justify-between items-center px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-slate-100 bg-white shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-primary transition-colors shrink-0"
              aria-label="Back to conversations"
              title="Back to conversations"
            >
              <BiArrowBack size={22} />
            </button>
          )}
          <div className="relative shrink-0">
            <Avatar
              name={opponentName}
              src={opponentAvatar}
              size="sm"
              status={isConnected ? "online" : "offline"}
            />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-800 text-base hover:text-primary transition-colors cursor-pointer leading-tight font-grotesk truncate">
              {user.role === "patient" ? (
                <Link href={`/patient/doctors/${opponentId}`}>
                  {opponentName}
                </Link>
              ) : (
                opponentName
              )}
            </h2>
            <p className="text-sm text-slate-500 truncate">
              {isConnected ? "Live Encryption Active" : "Connecting Securely..."}
              {startedLabel && (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  {startedLabel}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <CallButton
            consultationId={
              typeof consultationId === "string" ? consultationId : undefined
            }
            conversationId={conversation._id}
            participantName={opponentName}
            participantAvatar={opponentAvatar}
            scheduledAt={scheduledAt || linkedConsultation?.scheduledStartTime}
            scheduledEndAt={linkedConsultation?.scheduledEndTime}
            onCallStart={onCallStart}
            onCallEnd={onCallEnd}
          />
        </div>
      </div>

      {isOffline && <OfflineBanner />}

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 relative custom-scrollbar">
        <MessageList
          messages={messages}
          currentUserId={user.id}
          onMessageSeen={(id) => {
            socketMarkAsRead(id);
            restMarkAsRead(id);
          }}
        />
        <TypingIndicator typingUsers={Array.from(socketTypingUsers)} />
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-100 bg-white flex items-end gap-2 p-2 shrink-0">
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {user.role === "patient" && (
            <div className="mb-2">
              <QuickPhrases
                onSelect={(phrase) => handleSend(phrase, "quick_phrase")}
                disabled={isSending}
              />
            </div>
          )}
          <MessageInput
            onSend={handleSend}
            onTyping={(isTyping) => (isTyping ? startTyping() : stopTyping())}
            disabled={isSending}
          />
        </div>
      </div>

      <AttachRecordModal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        conversationId={conversation._id}
      />
    </div>
  );
}
