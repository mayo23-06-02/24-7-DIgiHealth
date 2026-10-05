import { defineModel, type Document, type ModelClass } from '@/lib/db';
/** Notification model only. Chat messages live in `@/lib/models/Message`. */

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
