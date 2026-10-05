import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IAuditLog extends Document {
  /** Id of the acting user (users.id), kept as a string. */
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
