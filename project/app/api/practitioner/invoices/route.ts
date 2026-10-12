import { NextRequest, NextResponse } from "next/server";
import { MedicalInvoice } from "@/lib/models/MedicalInvoice";
import { requirePatientAccessScoped, requireRole } from "@/lib/auth/access";
import { apiError, PublicError } from "@/lib/api/errors";
import { createMedicalInvoice, INVOICE_STATUSES, invoiceView, notifyInvoiceIssued } from "@/lib/billing/medicalInvoices";
import { isValidId } from "@/lib/db";

/** The doctor's own medical-aid invoices, newest first. Optional ?patientId= and ?status=. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("practitioner");
    const sp = new URL(req.url).searchParams;
    const filter: Record<string, unknown> = { practitionerId: user.userId };
    const patientId = sp.get("patientId");
    if (patientId) {
      if (!isValidId(patientId)) throw new PublicError("Invalid patient ID");
      filter.patientId = patientId;
    }
    const status = sp.get("status");
    if (status && INVOICE_STATUSES.includes(status as never)) filter.status = status;
    const rows = await MedicalInvoice.find(filter).sort({ issuedAt: -1 }).limit(500).lean();
    return NextResponse.json({ success: true, data: rows.map(invoiceView) });
  } catch (err) {
    return apiError(err, "Could not load invoices.");
  }
}

/** Issue a medical-aid invoice. Totals and the medical aid snapshot are worked out here. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = await requireRole("practitioner");
    await requirePatientAccessScoped(String(body?.patientId ?? ""));
    const invoice = await createMedicalInvoice(user.userId, body ?? {});
    await notifyInvoiceIssued(invoice);
    return NextResponse.json({ success: true, data: invoiceView(invoice) }, { status: 201 });
  } catch (err) {
    return apiError(err, "Could not create the invoice.");
  }
}
