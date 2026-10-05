import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'quick_phrase' | 'record_attachment' | 'call_log';
  fileUrl?: string;
  mediaId?: string;
  fileMime?: string;
  recordId?: string;
  clientId?: string; // For idempotent message operations with Ably
  isRead: boolean;
  readAt?: Date;
  deliveredAt: Date;
  /** Set once the "you have a new message" nudge email has gone out for this message. */
  reminderEmailSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const Message: ModelClass<IMessage> = defineModel<IMessage>({
  name: 'Message', table: 'messages',
  refs: { conversationId: 'Conversation', senderId: 'User', receiverId: 'User', recordId: 'AttachedRecord' },
});
export default Message;
