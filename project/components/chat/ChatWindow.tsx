"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import Link from "next/link";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import QuickPhrases from "./QuickPhrases";
import ConsultationTimer from "./ConsultationTimer";
import CallButton, { ActiveCallInfo } from "./CallButton";
import TypingIndicator from "./TypingIndicator";
import OfflineBanner from "./OfflineBanner";
import PDFReportButton from "./PDFReportButton";
import AttachRecordModal from "./AttachRecordModal";
import { useChat } from "@/hooks/useChat";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { BiLoaderAlt, BiPlus } from "react-icons/bi";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";

export default function ChatWindow({
  consultationId: propConsultationId,
  conversationId: propConversationId,
  onCallStart,
  onCallEnd,
}: {
  consultationId?: string;
  conversationId?: string;
  onCallStart?: (info: ActiveCallInfo) => void;
  onCallEnd?: () => void;
} = {}) {
  const params = useParams();
  const consultationId = propConsultationId || params.consultationId;
  const conversationId = propConversationId;

  const { user } = useAuthContext();

  // Base data fetching (REST for history and info)
  const {
    messages: initialMessages,
    sendMessage: restSendMessage,
    conversation,
    loading,
    markAsRead: restMarkAsRead,
  } = useChat((consultationId || conversationId) as string, !!conversationId);

  // Real-time integration
  const {
    messages: socketMessages,
    setMessages: setSocketMessages,
    typingUsers: socketTypingUsers,
    isConnected,
    sendMessage: socketSendMessage,
    startTyping,
    stopTyping,
    markAsRead: socketMarkAsRead,
  } = useChatSocket(conversationId || conversation?._id, user?.id || null);

  const { isOffline, queueMessage } = useOfflineQueue();
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Merge initial messages with socket messages
  const [allMessages, setAllMessages] = useState<any[]>([]);

  useEffect(() => {
    if (initialMessages.length > 0) {
      setAllMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (socketMessages.length > 0) {
      setAllMessages((prev) => {
        const combined = [...prev, ...socketMessages];
        const seen = new Set();
        return combined.filter((msg) => {
          const mid = msg._id || msg.id;
          if (seen.has(mid)) return false;
          seen.add(mid);
          return true;
        });
      });
    }
  }, [socketMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  if (loading || !conversation || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-2xl h-full">
        <BiLoaderAlt className="animate-spin text-4xl text-primary" />
      </div>
    );
  }

  const handleSend = async (
    content: string,
    type = "text",
    fileUrl?: string,
    fileMime?: string,
  ) => {
    if (!content && !fileUrl) return;
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
    };

    if (isOffline) {
      await queueMessage(msg);
      // Optimistic update for offline
      setAllMessages((prev) => [
        ...prev,
        {
          ...msg,
          _id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        },
      ]);
    } else {
      // Try socket first
      const sent = socketSendMessage(msg);
      if (!sent) {
        await restSendMessage(msg);
      }
    }
    stopTyping();
  };

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

  return (
    <Card className="flex flex-col h-full overflow-hidden  rounded-none">
      {/* Header */}
      <div className="flex justify-between items-center lg:px-6 py-4 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={opponentName} src={opponentAvatar} size="sm" />
            <div
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isConnected ? "bg-emerald-500" : "bg-slate-300"}`}
            />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base hover:text-primary transition-colors cursor-pointer leading-tight font-grotesk">
              {user.role === "patient" ? (
                <Link href={`/patient/doctors/${opponentId}`}>
                  {opponentName}
                </Link>
              ) : (
                opponentName
              )}
            </h2>
            <p className="text-sm text-slate-500 ">
              {isConnected
                ? "Live Encryption Active"
                : "Connecting Securely..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CallButton
            consultationId={consultationId as string}
            conversationId={conversationId as string}
            participantName={opponentName}
            participantAvatar={opponentAvatar}
            onCallStart={onCallStart}
            onCallEnd={onCallEnd}
          />
        </div>
      </div>

      {isOffline && <OfflineBanner />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 relative custom-scrollbar">
        <MessageList
          messages={allMessages}
          currentUserId={user.id}
          onMessageSeen={(id) => {
            socketMarkAsRead(id);
            restMarkAsRead(id);
          }}
        />
        <TypingIndicator typingUsers={Array.from(socketTypingUsers)} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100  bg-white flex items-end gap-2 shrink-0">
        {user.role === "practitioner" && (
          <button
            onClick={() => setIsAttachModalOpen(true)}
            className="mb-1 w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/50 transition-all flex items-center justify-center shrink-0"
            title="Attach Clinical Record"
          >
            <BiPlus size={22} />
          </button>
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          {user.role === "patient" && (
            <h1 className="mb-2">
              <QuickPhrases
                onSelect={(phrase) => handleSend(phrase, "quick_phrase")}
              />
            </h1>
          )}
          <MessageInput
            onSend={handleSend}
            onTyping={(isTyping) => (isTyping ? startTyping() : stopTyping())}
          />
        </div>
      </div>

      <AttachRecordModal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        conversationId={conversation._id}
      />
    </Card>
  );
}
