"use client";
import { useRouter } from "next/navigation";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

export interface CallInfo {
  roomUrl: string;
  roomName: string;
  token: string;
  callId: string;
  type: "video" | "voice";
  initiatedBy: string;
  participantName?: string;
  participantAvatar?: string;
  conversationId?: string; // to redirect to the correct chat
  consultationId?: string;
}

interface CallContextType {
  activeCall: CallInfo | null;
  incomingCall: CallInfo | null;
  setIncomingCall: (call: CallInfo | null) => void;
  acceptCall: (callInfo: CallInfo) => void;
  declineCall: (callId: string) => void;
  clearCall: () => void;
  isCallActive: boolean;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null);

  const acceptCall = useCallback(
    async (callInfo: CallInfo) => {
      try {
        // Fetch the room token and join details
        const res = await fetch(`/api/chat/call/join/${callInfo.callId}`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to join call");

        const fullCallInfo: CallInfo = {
          ...callInfo,
          roomUrl: data.roomUrl,
          roomName: data.roomName,
          token: data.token,
        };
        setActiveCall(fullCallInfo);
        setIncomingCall(null);

        // Redirect to the messages page with the conversation ID
        if (callInfo.conversationId) {
          router.push(`/patient/messages?chatId=${callInfo.conversationId}`);
        } else {
          // Fallback: go to messages page
          router.push("/patient/messages");
        }
      } catch (error) {
        console.error("Accept call error:", error);
        // Optionally show an error toast
        setIncomingCall(null);
      }
    },
    [router],
  );

  const declineCall = useCallback(async (callId: string) => {
    try {
      await fetch("/api/chat/call/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId }),
      });
    } catch (e) {
      /* ignore */
    }
    setIncomingCall(null);
  }, []);

  const clearCall = useCallback(() => {
    setActiveCall(null);
    setIncomingCall(null);
  }, []);

  const value = {
    activeCall,
    incomingCall,
    setIncomingCall,
    acceptCall,
    declineCall,
    clearCall,
    isCallActive: !!activeCall,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used within CallProvider");
  return context;
};
