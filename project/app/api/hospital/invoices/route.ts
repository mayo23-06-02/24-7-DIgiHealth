import { NextResponse } from "next/server";
import { MedicalInvoice } from "@/lib/models/MedicalInvoice";
import { requireRole } from "@/lib/auth/access";
import { resolveHospitalId } from "@/lib/hospital/resolveHospitalId";
import { apiError } from "@/lib/api/errors";
import { invoiceView } from "@/lib/billing/medicalInvoices";

/** Read-only list of medical-aid invoices issued by doctors at the admin's hospital. */
export async function GET() {
  try {
    const user = await requireRole("hospital_admin");
    const facilityId = await resolveHospitalId(user.userId, user.email);
    if (!facilityId) return NextResponse.json({ success: true, data: [] });
    const rows = await MedicalInvoice.find({ facilityId }).sort({ issuedAt: -1 }).limit(500).lean();
    return NextResponse.json({ success: true, data: rows.map(invoiceView) });
  } catch (err) {
    return apiError(err, "Could not load invoices.");
  }
}
