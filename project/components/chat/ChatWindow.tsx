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
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { BiLoaderAlt, BiPlus } from "react-icons/bi";
import Card from "../ui/Card";

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
  const { messages, sendMessage, conversation, loading, markAsRead } = useChat(
    (consultationId || conversationId) as string,
    !!conversationId,
  );
  const { isOffline, queueMessage } = useOfflineQueue();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    } else {
      await sendMessage(msg);
    }
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
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white shrink-0">
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
        </div>
        <div className="flex items-center gap-2">
          <CallButton
            consultationId={consultationId as string}
            conversationId={conversationId as string}
            role={user.role}
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
          messages={messages}
          currentUserId={user.id}
          onMessageSeen={markAsRead}
        />
        <TypingIndicator typingUsers={typingUsers} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 p-3 bg-white flex items-end gap-2 shrink-0">
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
            <div className="mb-2">
              <QuickPhrases
                onSelect={(phrase) => handleSend(phrase, "quick_phrase")}
              />
            </div>
          )}
          <MessageInput onSend={handleSend} onTyping={() => {}} />
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
