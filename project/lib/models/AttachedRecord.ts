import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IAttachedRecord extends Document {
  /** Hospital that owns this record; unset = entered by the patient. */
  facilityId?: string;
  consultationId?: string;      // which chat/consultation
  conversationId?: string;
  patientId: string;
  practitionerId?: string;
  type: 'lab_result' | 'prescription' | 'imaging' | 'soap_note' | 'other';
  title: string;
  description?: string;
  fileUrl: string;               // durable app proxy or legacy CDN URL
  fileMime: string;
  fileSize: number;
  mediaId?: string;              // Supabase media_assets id
  uploadedAt: Date;
  isRead: boolean;               // patient has viewed it
  createdAt: Date;
  updatedAt: Date;
}

export const AttachedRecord: ModelClass<IAttachedRecord> = defineModel<IAttachedRecord>({
  name: 'AttachedRecord', table: 'attached_records',
  refs: { patientId: 'User', practitionerId: 'User', consultationId: 'Consultation', conversationId: 'Conversation' },
});
export default AttachedRecord;
