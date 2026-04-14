import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAttachedRecord extends Document {
  consultationId?: Types.ObjectId;      // which chat/consultation
  conversationId?: Types.ObjectId;
  patientId: Types.ObjectId;
  practitionerId?: Types.ObjectId;
  type: 'lab_result' | 'prescription' | 'imaging' | 'soap_note' | 'other';
  title: string;
  description?: string;
  fileUrl: string;               // Cloudinary URL
  fileMime: string;
  fileSize: number;
  uploadedAt: Date;
  isRead: boolean;               // patient has viewed it
  createdAt: Date;
  updatedAt: Date;
}

const AttachedRecordSchema = new Schema<IAttachedRecord>({
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation' },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  practitionerId: { type: Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['lab_result', 'prescription', 'imaging', 'soap_note', 'other'], required: true },
  title: { type: String, required: true },
  description: { type: String },
  fileUrl: { type: String, required: true },
  fileMime: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

export const AttachedRecord: Model<IAttachedRecord> = mongoose.models.AttachedRecord || mongoose.model<IAttachedRecord>('AttachedRecord', AttachedRecordSchema);
export default AttachedRecord;
