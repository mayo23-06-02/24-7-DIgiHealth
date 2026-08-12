import AuditLog from "@/lib/models/AuditLog";
import type { RequestUser } from "@/lib/auth/getRequestUser";
import { writeAuditLog } from "@/lib/postgres/users";

export async function logAdminAction(input: {
  actor: RequestUser;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await AuditLog.create({
      actorId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
      ip: input.ip,
      userAgent: input.userAgent,
    });
  } catch (err) {
    // Deliberately non-fatal: a failed audit write must not roll back the admin
    // action the operator just performed. But it is a compliance event, not
    // noise — this trail is presented in the UI as an immutable record, so a
    // silent drop is worse than a loud one. Tag it so log-based alerting can
    // key on it rather than it disappearing into ordinary console output.
    console.error(
      "[logAdminAction] AUDIT_WRITE_FAILED — admin action completed but was NOT recorded",
      {
        action: input.action,
        actorId: input.actor.userId,
        actorEmail: input.actor.email,
        targetType: input.targetType,
        targetId: input.targetId,
        error: err instanceof Error ? err.message : String(err),
      },
    );
  }

  await writeAuditLog({
    actorMongoId: input.actor.userId,
    actorRole: input.actor.role,
    actorEmail: input.actor.email,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata,
    ip: input.ip,
    userAgent: input.userAgent,
  });
}
