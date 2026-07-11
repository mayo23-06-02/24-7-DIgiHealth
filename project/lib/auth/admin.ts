import { NextResponse } from "next/server";
import { getRequestUser, type RequestUser } from "@/lib/auth/getRequestUser";
import {
  isPlatformAdmin,
  isMegaAdmin,
  canAssignRole,
  SUPER_ASSIGNABLE_ROLES,
  MEGA_ASSIGNABLE_ROLES,
} from "@/lib/auth/adminRoles";

export {
  isPlatformAdmin,
  isMegaAdmin,
  canAssignRole,
  SUPER_ASSIGNABLE_ROLES,
  MEGA_ASSIGNABLE_ROLES,
};

export async function requirePlatformAdmin(): Promise<
  | { user: RequestUser; error?: never }
  | { user?: never; error: NextResponse }
> {
  const user = await getRequestUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!isPlatformAdmin(user.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user };
}

export async function requireMegaAdmin(): Promise<
  | { user: RequestUser; error?: never }
  | { user?: never; error: NextResponse }
> {
  const gate = await requirePlatformAdmin();
  if (gate.error) return gate;
  if (!isMegaAdmin(gate.user.role)) {
    return {
      error: NextResponse.json(
        { error: "Mega admin access required" },
        { status: 403 },
      ),
    };
  }
  return { user: gate.user };
}
