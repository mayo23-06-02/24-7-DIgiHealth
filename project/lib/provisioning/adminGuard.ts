import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import type { RequestUser } from "@/lib/auth/getRequestUser";
import Facility from "@/lib/models/Facility";
import { isValidId } from "@/lib/db";

/** Platform admin + an existing facility, or the error response to return. */
export async function loadFacilityForAdmin(
  idParam: string,
): Promise<
  | { user: RequestUser; facility: { id: string; name: string; fileNumberPrefix?: string }; error?: never }
  | { error: NextResponse; user?: never; facility?: never }
> {
  const gate = await requirePlatformAdmin();
  if (gate.error) return { error: gate.error };
  if (!isValidId(idParam)) return { error: NextResponse.json({ error: "Invalid facility id" }, { status: 400 }) };
  const f = await Facility.findById(idParam).select("name fileNumberPrefix").lean();
  if (!f) return { error: NextResponse.json({ error: "Facility not found" }, { status: 404 }) };
  return { user: gate.user, facility: { id: String(f._id), name: f.name, fileNumberPrefix: f.fileNumberPrefix } };
}
