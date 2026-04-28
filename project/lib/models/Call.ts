import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICall extends Document {
  consultationId?: Types.ObjectId;
  conversationId: Types.ObjectId;
  initiatedBy: Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  type: 'video' | 'voice';
  status: 'requested' | 'active' | 'ended' | 'missed';
  livekitRoomName?: string;
  livekitRoomUrl?: string;
}

const CallSchema = new Schema<ICall>({
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation', required: false },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  durationSeconds: { type: Number, default: 0 },
  type: { type: String, enum: ['video', 'voice'], required: true },
  status: { type: String, enum: ['requested', 'active', 'ended', 'missed'], default: 'active' },
  livekitRoomName: { type: String },
  livekitRoomUrl: { type: String },
});

export const Call: Model<ICall> = mongoose.models.Call || mongoose.model<ICall>('Call', CallSchema);
export default Call;
