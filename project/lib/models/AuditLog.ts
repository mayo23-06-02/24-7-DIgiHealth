import { defineModel, type Document, type ModelClass } from '@/lib/db';
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

export const AuditLog: ModelClass<IAuditLog> = defineModel<IAuditLog>({
  name: 'AuditLog', table: 'audit_logs',
  refs: { actorId: 'User' },
});
export default AuditLog;
