import { NextRequest } from "next/server";
import { MedicalInvoice } from "@/lib/models/MedicalInvoice";
import { Facility } from "@/lib/models/Facility";
import { requireUser } from "@/lib/auth/access";
import { apiError, PublicError } from "@/lib/api/errors";
import { canViewInvoice, formatAddress } from "@/lib/billing/medicalInvoices";
import { buildMedicalInvoicePdf } from "@/lib/pdf/buildMedicalInvoicePdf";
import { pdfResponse } from "@/lib/pdf/createPdfDocument";
import { isValidId, toId } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Download a medical-aid invoice. A GET so the link in the notification and email works
 * directly. Open to the patient, their guardian, the issuing doctor, that hospital's admin
 * and platform admins; anyone else gets the same 404 as a missing invoice.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!isValidId(id)) throw new PublicError("Invoice not found", 404);
    const inv = await MedicalInvoice.findById(id).lean();
    if (!inv || !(await canViewInvoice(user, inv))) throw new PublicError("Invoice not found", 404);

    const facility = await Facility.findById(toId(inv.facilityId)).select("address").lean();
    const { buffer, filename } = await buildMedicalInvoicePdf({
      ...inv,
      serviceDate: inv.serviceDate,
      issuedAt: inv.issuedAt,
      facilityAddress: formatAddress(facility?.address),
      total: Number(inv.total),
      items: (inv.items ?? []).map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        amount: Number(i.amount),
      })),
    });
    return pdfResponse(buffer, filename);
  } catch (err) {
    return apiError(err, "Could not download the invoice.");
  }
}
