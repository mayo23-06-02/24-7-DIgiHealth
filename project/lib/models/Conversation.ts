import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IConversation extends Document {
  consultationId?: Types.ObjectId;
  patientId: Types.ObjectId;
  practitionerId: Types.ObjectId;
  status: 'active' | 'ended' | 'pending';
  minutesAllocated: number;
  minutesUsed: number;
  minutesRequested: number;
  minutesApproved: number;
  startedAt: Date;
  lastActivityAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  consultationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Consultation', 
    required: false,
    index: { unique: true, sparse: true }
  },
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  practitionerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'ended', 'pending'], default: 'active' },
  minutesAllocated: { type: Number, required: true },
  minutesUsed: { type: Number, default: 0 },
  minutesRequested: { type: Number, default: 0 },
  minutesApproved: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  lastActivityAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Conversation: Model<IConversation> = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
export default Conversation;
