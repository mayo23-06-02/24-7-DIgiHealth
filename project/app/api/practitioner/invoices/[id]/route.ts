import { NextRequest, NextResponse } from "next/server";
import { MedicalInvoice, type MedicalInvoiceStatus } from "@/lib/models/MedicalInvoice";
import { Notification } from "@/lib/models/Communications";
import { requireRole } from "@/lib/auth/access";
import { apiError, PublicError } from "@/lib/api/errors";
import { canMoveStatus, INVOICE_STATUSES, invoiceView } from "@/lib/billing/medicalInvoices";
import { isValidId, toId } from "@/lib/db";

const STATUS_TEXT: Record<string, string> = {
  submitted: "was submitted to your medical aid",
  paid: "is marked as paid",
  partially_paid: "is marked as partially paid",
  rejected: "was rejected by your medical aid",
  cancelled: "was cancelled",
};

async function ownInvoice(id: string, practitionerId: string) {
  if (!isValidId(id)) throw new PublicError("Invoice not found", 404);
  const inv = await MedicalInvoice.findOne({ _id: id, practitionerId }).lean();
  if (!inv) throw new PublicError("Invoice not found", 404);
  return inv;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("practitioner");
    const inv = await ownInvoice((await params).id, user.userId);
    return NextResponse.json({ success: true, data: invoiceView(inv) });
  } catch (err) {
    return apiError(err, "Could not load the invoice.");
  }
}

/** Record where the claim stands. No money moves through the platform. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("practitioner");
    const { id } = await params;
    const inv = await ownInvoice(id, user.userId);
    const body = await req.json().catch(() => ({}));
    const status = String(body?.status ?? "") as MedicalInvoiceStatus;
    if (!INVOICE_STATUSES.includes(status)) throw new PublicError("Choose a valid status.");
    if (!canMoveStatus(inv.status, status)) {
      throw new PublicError(
        status === "cancelled" ? "Only an invoice that has not been submitted can be cancelled." : `An invoice that is ${inv.status.replace("_", " ")} cannot move to ${status.replace("_", " ")}.`,
        409,
      );
    }
    const updated = await MedicalInvoice.findOneAndUpdate(
      { _id: id, practitionerId: user.userId, status: inv.status },
      { $set: { status, statusChangedAt: new Date() } },
      { new: true },
    ).lean();
    if (!updated) throw new PublicError("The invoice changed. Refresh and try again.", 409);

    try {
      await Notification.create({
        userId: toId(inv.patientId)!,
        type: "medical_invoice",
        title: `Invoice ${inv.invoiceNumber} updated`,
        body: `Invoice ${inv.invoiceNumber} from ${inv.practitionerName} ${STATUS_TEXT[status] ?? `is now ${status}`}.`,
        data: { invoiceId: id, url: `/patient/billing?invoice=${id}`, pdfUrl: `/api/invoices/${id}/pdf`, status },
        isRead: false,
        deliveredVia: ["in_app"],
      });
    } catch (e) {
      console.warn("[invoices] status notification failed:", e);
    }

    return NextResponse.json({ success: true, data: invoiceView(updated) });
  } catch (err) {
    return apiError(err, "Could not update the invoice.");
  }
}
