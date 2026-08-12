import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  /**
   * Stored as a string, not an ObjectId, because admin identities come from two
   * id systems mid-migration: Mongo ObjectIds (24-char hex) and Postgres uuids
   * (36 chars with dashes). Declaring this an ObjectId made every write by a
   * uuid-identified admin throw a CastError, which logAdminAction swallowed —
   * so those actions were silently absent from the "immutable" audit trail.
   * Existing ObjectId-valued documents still read back fine as strings.
   */
  actorId: string;
  actorRole: string;
  actorEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    actorEmail: String,
    action: { type: String, required: true, index: true },
    targetType: { type: String, index: true },
    targetId: { type: String, index: true },
    metadata: Schema.Types.Mixed,
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
