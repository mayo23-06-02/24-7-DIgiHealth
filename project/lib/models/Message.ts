import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'quick_phrase' | 'record_attachment';
  fileUrl?: string;
  fileMime?: string;
  recordId?: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  deliveredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  type: { type: String, enum: ['text', 'image', 'file', 'audio', 'quick_phrase', 'record_attachment'], default: 'text' },
  fileUrl: { type: String },
  fileMime: { type: String },
  recordId: { type: Schema.Types.ObjectId, ref: 'AttachedRecord' },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  deliveredAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
export default Message;
