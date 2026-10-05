import { NextRequest, NextResponse } from "next/server";
import { loadFacilityForAdmin } from "@/lib/provisioning/adminGuard";
import Staff from "@/lib/models/Staff";
import User from "@/lib/models/User";
import { resendOnboarding } from "@/lib/provisioning/setPassword";
import { getAppOrigin } from "@/lib/supabase/auth";
import { isValidId } from "@/lib/db";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

/** Re-send the set-password email to a doctor who has not activated yet. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; staffId: string }> }) {
  try {
    const { id, staffId } = await params;
    const g = await loadFacilityForAdmin(id);
    if (g.error) return g.error;
    if (!isValidId(staffId)) return NextResponse.json({ error: "Invalid staff id" }, { status: 400 });

    const staff = await Staff.findOne({ _id: staffId, facilityId: g.facility.id }).lean();
    if (!staff?.userId) return NextResponse.json({ error: "Staff member not found at this hospital" }, { status: 404 });
    const user = await User.findById(staff.userId).select("email firstName emailVerified").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.emailVerified) {
      return NextResponse.json({ error: "This person has already set up their account." }, { status: 409 });
    }
    const error = await resendOnboarding({
      user: { id: String(user._id), email: user.email, firstName: user.firstName },
      facilityName: g.facility.name,
      kind: "doctor",
      fileNumber: staff.fileNumber ?? "",
      origin: getAppOrigin(req.url),
    });
    if (error) return NextResponse.json({ error: "The email could not be sent. Try again shortly." }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
