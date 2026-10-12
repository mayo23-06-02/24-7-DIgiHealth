import { NextResponse } from "next/server";
import { MedicalInvoice } from "@/lib/models/MedicalInvoice";
import { requireUser } from "@/lib/auth/access";
import { apiError } from "@/lib/api/errors";
import { invoiceView, viewablePatientIds } from "@/lib/billing/medicalInvoices";

/** Medical-aid invoices for the signed-in patient and any minor dependants they guard. */
export async function GET() {
  try {
    const user = await requireUser();
    const patientIds = await viewablePatientIds(user.userId);
    const rows = await MedicalInvoice.find({ patientId: { $in: patientIds } })
      .sort({ issuedAt: -1 })
      .limit(500)
      .lean();
    return NextResponse.json({ success: true, data: rows.map(invoiceView) });
  } catch (err) {
    return apiError(err, "Could not load your invoices.");
  }
}
