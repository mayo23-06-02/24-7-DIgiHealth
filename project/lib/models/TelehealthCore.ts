import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ==== EmergencyDispatch ====
export interface IEmergencyDispatch extends Document {
  dispatchId: string;
  emtId: Types.ObjectId;
  patientId?: Types.ObjectId;
  callerPhone?: string;
  priority: 'red' | 'yellow' | 'green';
  status: 'pending' | 'en_route' | 'on_scene' | 'transporting' | 'at_facility' | 'completed' | 'cancelled';
  incidentLocation: { address: string; coordinates: [number, number] };
  targetFacilityId?: Types.ObjectId;
  timeline: { status: string; timestamp: Date; location?: [number, number] }[];
  vitals: { timestamp: Date; bp: string; hr: number; spo2: number; gcs: number }[];
  handoffNotes?: string;
  distanceDriven?: number;
  createdAt: Date;
  updatedAt: Date;
}
const EmergencyDispatchSchema = new Schema<IEmergencyDispatch>({
  dispatchId: { type: String, required: true, unique: true },
  emtId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'User' },
  callerPhone: String,
  priority: { type: String, enum: ['red', 'yellow', 'green'], default: 'yellow' },
  status: { 
    type: String, 
    enum: ['pending', 'en_route', 'on_scene', 'transporting', 'at_facility', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  incidentLocation: {
    address: String,
    coordinates: { type: [Number], index: '2dsphere' }
  },
  targetFacilityId: { type: Schema.Types.ObjectId, ref: 'Facility' },
  timeline: [{ 
    status: String, 
    timestamp: { type: Date, default: Date.now }, 
    location: { type: [Number] } 
  }],
  vitals: [{
    timestamp: { type: Date, default: Date.now },
    bp: String,
    hr: Number,
    spo2: Number,
    gcs: { type: Number, min: 3, max: 15 }
  }],
  handoffNotes: String,
  distanceDriven: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

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

export const EmergencyDispatch = mongoose.models.EmergencyDispatch || mongoose.model<IEmergencyDispatch>('EmergencyDispatch', EmergencyDispatchSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
