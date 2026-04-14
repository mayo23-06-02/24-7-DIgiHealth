import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  consultationId?: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content: string;
  imageUrl?: string;
  isRead: boolean;
  readAt?: Date;
}
const MessageSchema = new Schema<IMessage>({
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation' },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User' },
  content: String,
  imageUrl: String,
  isRead: { type: Boolean, default: false },
  readAt: Date
}, { timestamps: true });

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: string;
  title: string;
  body: string;
  data?: any;
  isRead: boolean;
  deliveredVia: string[];
}
const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  type: String,
  title: String,
  body: String,
  data: Schema.Types.Mixed,
  isRead: { type: Boolean, default: false },
  deliveredVia: [{ type: String }]
}, { timestamps: true });

export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
