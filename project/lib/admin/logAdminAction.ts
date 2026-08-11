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
    console.error("[logAdminAction]", err);
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
