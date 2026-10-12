import { NextRequest, NextResponse } from "next/server";
import { requirePatientAccessScoped, requireRole } from "@/lib/auth/access";
import { apiError } from "@/lib/api/errors";
import { billingFacilities, medicalAidOnFile } from "@/lib/billing/medicalInvoices";

/**
 * What the invoice form needs for one patient: the hospitals where this doctor may bill
 * them, and the medical aid each hospital has on file. An empty list hides "Create invoice".
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("practitioner");
    const patientId = new URL(req.url).searchParams.get("patientId") ?? "";
    await requirePatientAccessScoped(patientId);
    const facilities = await billingFacilities(user.userId, patientId);
    const withAid = await Promise.all(
      facilities.map(async (f) => {
        const aid = await medicalAidOnFile(patientId, f.id);
        return { ...f, medicalAid: { provider: aid.provider, planName: aid.planName, memberNumber: aid.memberNumber } };
      }),
    );
    return NextResponse.json({ success: true, data: { facilities: withAid } });
  } catch (err) {
    return apiError(err, "Could not load invoice options.");
  }
}
