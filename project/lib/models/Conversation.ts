import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IConversation extends Document {
  /** Hospital that owns this record; unset = entered by the patient. */
  facilityId?: string;
  consultationId?: string;
  patientId: string;
  practitionerId: string;
  status: 'active' | 'ended' | 'pending';
  minutesAllocated: number;
  minutesUsed: number;
  minutesRequested: number;
  minutesApproved: number;
  startedAt: Date;
  lastActivityAt: Date;
}

export const Conversation: ModelClass<IConversation> = defineModel<IConversation>({
  name: 'Conversation', table: 'conversations',
  refs: { consultationId: 'Consultation', patientId: 'User', practitionerId: 'User' },
});
export default Conversation;
