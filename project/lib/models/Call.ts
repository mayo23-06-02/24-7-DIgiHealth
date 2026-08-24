import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICall extends Document {
  consultationId?: Types.ObjectId;
  conversationId: Types.ObjectId;
  initiatedBy: Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  type: 'video' | 'voice';
  status: 'requested' | 'active' | 'ended' | 'missed' | 'declined';
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
  status: { type: String, enum: ['requested', 'active', 'ended', 'missed', 'declined'], default: 'active' },
  livekitRoomName: { type: String },
  livekitRoomUrl: { type: String },
});

/**
 * At most one live call per conversation, enforced by the database rather than
 * by a read-then-write in the route.
 *
 * Two clients whose appointment countdowns hit zero in the same instant both
 * used to miss the `findOne` and both `create`, producing two active Call rows
 * for one conversation. Each then looked like an "incoming call" to the other
 * party's poller, and declining either one tore down the LiveKit room both
 * users were already sitting in. The partial filter keeps the constraint to
 * live rows, so the many ended/declined rows a conversation accumulates never
 * collide.
 */
CallSchema.index(
  { conversationId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

/** Same guarantee keyed on the consultation, for scheduled-appointment sessions. */
CallSchema.index(
  { consultationId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'active',
      consultationId: { $exists: true },
    },
  },
);

export const Call: Model<ICall> = mongoose.models.Call || mongoose.model<ICall>('Call', CallSchema);
export default Call;
