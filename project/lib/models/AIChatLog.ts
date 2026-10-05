import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IAIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  at: Date;
}

export interface IAIChatLog extends Document {
  practitionerId: string;
  messages: IAIChatMessage[];
  modelUsed: string;
  createdAt: Date;
  updatedAt: Date;
}

export const AIChatLog: ModelClass<IAIChatLog> = defineModel<IAIChatLog>({
  name: 'AIChatLog', table: 'ai_chat_logs',
  refs: { practitionerId: 'User' },
});
