export type PlatformAdminRole = "super_admin" | "mega_admin";

export function isPlatformAdmin(role?: string | null): role is PlatformAdminRole {
  return role === "super_admin" || role === "mega_admin";
}

export function isMegaAdmin(role?: string | null): boolean {
  return role === "mega_admin";
}

export const SUPER_ASSIGNABLE_ROLES = [
  "patient",
  "practitioner",
  "hospital_admin",
  "inspector",
] as const;

export const MEGA_ASSIGNABLE_ROLES = [
  ...SUPER_ASSIGNABLE_ROLES,
  "super_admin",
  "mega_admin",
] as const;

export function canAssignRole(actorRole: string, targetRole: string): boolean {
  if (isMegaAdmin(actorRole)) {
    return (MEGA_ASSIGNABLE_ROLES as readonly string[]).includes(targetRole);
  }
  if (actorRole === "super_admin") {
    return (SUPER_ASSIGNABLE_ROLES as readonly string[]).includes(targetRole);
  }
  return false;
}
