import mongoose, { Schema, Document, Model, Types } from 'mongoose';



// ==== AuditLog ====
export interface IAuditLog extends Document {
  actorId: Types.ObjectId;
  targetId?: Types.ObjectId;
  action: string;
  timestamp: Date;
  ipAddress?: string;
  metadata?: any;
}
const AuditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: Schema.Types.ObjectId },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
  metadata: Schema.Types.Mixed
});
AuditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
