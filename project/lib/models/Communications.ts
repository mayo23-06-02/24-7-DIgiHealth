import mongoose, { Schema, Document, Types, Model } from 'mongoose';

/**
 * Notification model only.
 *
 * IMPORTANT: Do NOT register a `Message` model here.
 * A legacy schema used to define Message with `consultationId` only.
 * Importing Notification would register that schema first via:
 *   mongoose.models.Message || mongoose.model('Message', ...)
 * and then lib/models/Message.ts would reuse the wrong schema.
 * Queries by conversationId then fail to cast ObjectIds → empty chat history.
 *
 * Use `@/lib/models/Message` for chat messages.
 */

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: string;
  title: string;
  body: string;
  data?: unknown;
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
  deliveredVia: [{ type: String }],
}, { timestamps: true });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
