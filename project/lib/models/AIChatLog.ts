import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  at: Date;
}

export interface IAIChatLog extends Document {
  practitionerId: Types.ObjectId;
  messages: IAIChatMessage[];
  modelUsed: string;
  createdAt: Date;
  updatedAt: Date;
}

const AIChatMessageSchema = new Schema<IAIChatMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const AIChatLogSchema = new Schema<IAIChatLog>(
  {
    practitionerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [AIChatMessageSchema],
    modelUsed: { type: String, required: true },
  },
  { timestamps: true },
);

AIChatLogSchema.index({ practitionerId: 1, createdAt: -1 });

export const AIChatLog =
  mongoose.models.AIChatLog || mongoose.model<IAIChatLog>('AIChatLog', AIChatLogSchema);
