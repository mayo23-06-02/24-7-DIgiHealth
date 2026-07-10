/**
 * TypeScript interfaces for chat system data structures
 * Replaces 'any' types with proper type definitions
 */

// Message types
export interface ChatMessage {
  _id?: string;
  id?: string;
  conversationId: string;
  senderId: string;
  receiverId?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'quick_phrase' | 'audio' | 'record_attachment' | 'call_log';
  fileUrl?: string;
  fileMime?: string;
  createdAt: string | Date;
  isRead?: boolean;
  readAt?: Date;
  clientId?: string; // For optimistic UI updates
}

// Doctor/Practitioner types
export interface Doctor {
  id: string;
  name: string;
  avatarUrl?: string;
  isOnline?: boolean;
  specialisation?: string;
  location?: string;
  rating?: number;
  _id?: string; // MongoDB ObjectId
}

// Patient types
export interface Patient {
  id: string;
  fullName: string;
  _id?: string; // MongoDB ObjectId
}

// Agenda/Consultation types
export interface AgendaItem {
  id: string;
  type: 'doctor' | 'appointment' | 'refill';
  status: 'requested' | 'approved' | 'pending' | 'completed' | 'cancelled';
  practitionerId?: string;
  dr?: string; // Doctor name
  img?: string;
  scheduledStartTime?: string | Date;
  scheduledEndTime?: string | Date;
  _id?: string; // MongoDB ObjectId
}

// Conversation types
export interface Conversation {
  _id: string;
  id?: string;
  patientId?: string | Patient;
  practitionerId?: string | Doctor;
  contactId?: string;
  contactName?: string;
  doctor?: string;
  lastMessage?: string;
  timestamp?: string;
  unread?: number;
  online?: boolean;
  tab?: 'contacts' | 'pending';
  isPlaceholder?: boolean;
  avatar?: string;
  consultationId?: string | Consultation;
}

export interface Consultation {
  _id?: string;
  id?: string;
  scheduledStartTime?: string | Date;
  scheduledEndTime?: string | Date;
  status?: string;
  type?: string;
}

// Call types
export interface CallInfo {
  callId: string;
  roomUrl: string;
  roomName: string;
  token: string;
  type: 'video' | 'voice';
  initiatedBy?: string;
  participantName?: string;
  participantAvatar?: string;
  conversationId?: string;
  consultationId?: string;
}

// API response types
export interface PatientDataResponse {
  data: Patient[];
}

export interface DoctorsResponse {
  doctors: Doctor[];
}

export interface AgendaResponse {
  agenda: AgendaItem[];
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

// Socket message types
export interface SocketMessage {
  conversationId: string;
  senderId: string;
  receiverId?: string;
  content: string;
  type?: string;
  fileUrl?: string;
  fileMime?: string;
  clientId?: string;
}

export interface MessageReadEvent {
  messageId: string;
  readAt: string;
}

export interface TypingEvent {
  userId: string;
}
