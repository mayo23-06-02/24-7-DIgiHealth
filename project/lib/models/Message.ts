import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'quick_phrase' | 'record_attachment' | 'call_log';
  fileUrl?: string;
  fileMime?: string;
  recordId?: Types.ObjectId;
  clientId?: string; // For idempotent message operations with Ably
  isRead: boolean;
  readAt?: Date;
  deliveredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'quick_phrase', 'record_attachment', 'call_log'],
    default: 'text',
  },
  fileUrl: { type: String },
  fileMime: { type: String },
  recordId: { type: Schema.Types.ObjectId, ref: 'AttachedRecord' },
  clientId: { type: String, index: true, sparse: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  deliveredAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Compound index for idempotent operations
MessageSchema.index({ clientId: 1, conversationId: 1 }, { unique: true, sparse: true });
MessageSchema.index({ conversationId: 1, createdAt: -1 });

/**
 * Guard against a legacy Message model (Communications.ts used to register one
 * without conversationId). If that schema is already cached, replace it.
 */
function getMessageModel(): Model<IMessage> {
  const existing = mongoose.models.Message as Model<IMessage> | undefined;
  if (existing) {
    const hasConversationId = !!existing.schema.path('conversationId');
    if (hasConversationId) {
      return existing;
    }
    // Wrong schema registered first (legacy Communications.ts) — drop and re-register
    delete mongoose.models.Message;
  }
  return mongoose.model<IMessage>('Message', MessageSchema);
}

export const Message: Model<IMessage> = getMessageModel();
export default Message;
