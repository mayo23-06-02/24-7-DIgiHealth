import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISystemConfig extends Document {
  features: any;
  maintenanceMode: boolean;
  popiaVersion: string;
  consultationFeeDefault: number;
  emergencyNumbers: string[];
  supportedLanguages: string[];
}
const SystemConfigSchema = new Schema<ISystemConfig>({
  _id: { type: String, default: 'singleton' },
  features: Schema.Types.Mixed,
  maintenanceMode: Boolean,
  popiaVersion: String,
  consultationFeeDefault: Number,
  emergencyNumbers: [String],
  supportedLanguages: [String]
});

export interface IOfflineActionQueue extends Document {
  userId: Types.ObjectId;
  action: string;
  payload: any;
  retryCount: number;
  lastAttempt: Date;
  syncedAt?: Date;
}
const OfflineActionQueueSchema = new Schema<IOfflineActionQueue>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: String,
  payload: Schema.Types.Mixed,
  retryCount: Number,
  lastAttempt: Date,
  syncedAt: Date
});

export const SystemConfig = mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
export const OfflineActionQueue = mongoose.models.OfflineActionQueue || mongoose.model<IOfflineActionQueue>('OfflineActionQueue', OfflineActionQueueSchema);
