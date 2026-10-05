import { NextRequest, NextResponse } from "next/server";
import { loadFacilityForAdmin } from "@/lib/provisioning/adminGuard";
import { FacilityPatient } from "@/lib/models/FacilityPatient";
import User from "@/lib/models/User";
import { resendOnboarding } from "@/lib/provisioning/setPassword";
import { getAppOrigin } from "@/lib/supabase/auth";
import { isValidId } from "@/lib/db";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

/** Re-send the set-password email to a patient who has not activated yet. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  try {
    const { id, fileId } = await params;
    const g = await loadFacilityForAdmin(id);
    if (g.error) return g.error;
    if (!isValidId(fileId)) return NextResponse.json({ error: "Invalid file id" }, { status: 400 });

    const file = await FacilityPatient.findOne({ _id: fileId, facilityId: g.facility.id }).lean();
    if (!file) return NextResponse.json({ error: "File not found at this hospital" }, { status: 404 });
    const user = await User.findById(file.patientId).select("email firstName emailVerified").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.emailVerified) {
      return NextResponse.json({ error: "This patient has already set up their account." }, { status: 409 });
    }
    const error = await resendOnboarding({
      user: { id: String(user._id), email: user.email, firstName: user.firstName },
      facilityName: g.facility.name,
      kind: "patient",
      fileNumber: file.fileNumber,
      origin: getAppOrigin(req.url),
    });
    if (error) return NextResponse.json({ error: "The email could not be sent. Try again shortly." }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
