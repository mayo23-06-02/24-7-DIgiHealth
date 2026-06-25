export interface ActiveCallInfo {
  roomUrl: string;
  roomName: string;
  token: string;
  callId: string;
  type: "video" | "voice";
  initiatedBy?: string;
  participantName?: string;
  participantAvatar?: string;
}

export interface CallButtonProps {
  consultationId?: string;
  conversationId?: string;
  participantName?: string;
  participantAvatar?: string;
  scheduledAt?: string | Date;
  scheduledEndAt?: string | Date;
  user?: { id?: string; [key: string]: unknown };
  onCallStart?: (info: ActiveCallInfo) => void;
  onCallEnd?: () => void;
}