import { defineModel, type Document, type ModelClass } from '@/lib/db';
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
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: unknown;
  isRead: boolean;
  deliveredVia: string[];
}

export const Notification: ModelClass<INotification> = defineModel<INotification>({
  name: 'Notification', table: 'notifications',
  refs: { userId: 'User' },
});
