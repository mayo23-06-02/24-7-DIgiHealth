import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  PaymentTransaction,
  PayoutRequest,
  Subscription,
} from "@/lib/models/Billing";
import {
  buildBillingReportPdf,
  buildInvoiceReceiptPdf,
  type BillingDocKind,
} from "@/lib/pdf/buildBillingPdf";
import { pdfResponse } from "@/lib/pdf/createPdfDocument";
import { resolveHospitalId } from "@/lib/hospital/resolveHospitalId";

export const runtime = "nodejs";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    await connectToDatabase();
    return (await User.findById(payload.userId).lean()) as any;
  } catch {
    return null;
  }
}

function fmtZAR(n: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
  }).format(n || 0);
}

/**
 * POST /api/billing/export
 * Body:
 *  { type: "receipt" | "invoice", transactionId: string }
 *  { type: "report", reportKind?: "statement" | "payouts" | "full" }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const type = String(body.type || "").toLowerCase();

    await connectToDatabase();

    const party = {
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
      email: user.email as string,
      role: user.role as string,
    };

    // ── Single invoice / receipt ───────────────────────────────────────────
    if (type === "receipt" || type === "invoice") {
      const transactionId = body.transactionId || body.id;
      if (!transactionId) {
        return NextResponse.json(
          { error: "transactionId is required" },
          { status: 400 },
        );
      }

      const txn = (await PaymentTransaction.findById(transactionId).lean()) as any;
      if (!txn) {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }

      const role = user.role as string;
      const uid = user._id.toString();
      const isOwner = txn.patientId?.toString() === uid;
      const isPract = txn.practitionerId?.toString() === uid;
      const isPlatformAdmin = ["super_admin", "mega_admin", "inspector"].includes(
        role,
      );
      let isFacilityAdmin = false;
      if (role === "hospital_admin") {
        const hospitalId = await resolveHospitalId(uid, user.email);
        isFacilityAdmin =
          !!hospitalId && txn.facilityId?.toString() === hospitalId;
      }

      if (!isOwner && !isPract && !isPlatformAdmin && !isFacilityAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Prefer invoice wording for pending/open amounts; receipt for completed
      const kind: BillingDocKind =
        type === "invoice"
          ? "invoice"
          : txn.status === "completed" || txn.status === "paid"
            ? "receipt"
            : "invoice";

      const { buffer, filename } = await buildInvoiceReceiptPdf({
        kind: type === "invoice" ? "invoice" : kind,
        transaction: txn,
        billTo: party,
      });
      return pdfResponse(buffer, filename);
    }

    // ── Full billing report ────────────────────────────────────────────────
    if (type === "report") {
      const role = user.role as string;
      const reportKind = String(body.reportKind || "full");

      if (role === "patient") {
        const [transactions, subscription] = await Promise.all([
          PaymentTransaction.find({ patientId: user._id })
            .sort({ timestamp: -1 })
            .limit(200)
            .lean(),
          Subscription.findOne({ patientId: user._id })
            .sort({ createdAt: -1 })
            .lean(),
        ]);
        const completed = transactions.filter(
          (t: any) => t.status === "completed",
        );
        const totalSpent = completed.reduce(
          (s: number, t: any) => s + (t.amount || 0),
          0,
        );

        const { buffer, filename } = await buildBillingReportPdf({
          title: "Patient Billing Statement",
          generatedFor: party,
          summary: {
            "Total spent": fmtZAR(totalSpent),
            Transactions: transactions.length,
            Completed: completed.length,
            Plan: (subscription as any)?.tier || "free",
            Status: (subscription as any)?.status || "—",
          },
          transactions: transactions as any,
          notes:
            "Official DigiHealth patient statement. Download individual receipts from Billing for medical aid claims.",
        });
        return pdfResponse(buffer, filename);
      }

      if (role === "practitioner") {
        const [transactions, payouts] = await Promise.all([
          PaymentTransaction.find({ practitionerId: user._id })
            .sort({ timestamp: -1 })
            .limit(200)
            .lean(),
          PayoutRequest.find({ practitionerId: user._id })
            .sort({ requestedAt: -1 })
            .limit(100)
            .lean(),
        ]);
        const totalEarned = transactions
          .filter((t: any) => t.status === "completed")
          .reduce(
            (s: number, t: any) => s + (t.practitionerEarnings || t.amount || 0),
            0,
          );
        const totalPaid = payouts
          .filter((p: any) => p.status === "paid")
          .reduce((s: number, p: any) => s + (p.amount || 0), 0);

        const { buffer, filename } = await buildBillingReportPdf({
          title:
            reportKind === "payouts"
              ? "Practitioner Payout Report"
              : "Practitioner Earnings Report",
          generatedFor: party,
          summary: {
            "Total earned": fmtZAR(totalEarned),
            "Paid out": fmtZAR(totalPaid),
            Transactions: transactions.length,
            Payouts: payouts.length,
          },
          transactions:
            reportKind === "payouts" ? [] : (transactions as any),
          payouts: payouts.map((p: any) => ({
            amount: p.amount,
            status: p.status,
            consultationCount: p.consultationCount,
            periodFrom: p.periodFrom,
            periodTo: p.periodTo,
            requestedAt: p.requestedAt,
          })),
        });
        return pdfResponse(buffer, filename);
      }

      if (role === "hospital_admin") {
        const hospitalId = await resolveHospitalId(user._id.toString(), user.email);
        if (!hospitalId) {
          return NextResponse.json(
            { error: "No facility linked to this account." },
            { status: 404 },
          );
        }
        const [transactions, payouts] = await Promise.all([
          PaymentTransaction.find({ facilityId: hospitalId })
            .sort({ timestamp: -1 })
            .limit(200)
            .lean(),
          PayoutRequest.find({ facilityId: hospitalId })
            .populate("practitionerId", "firstName lastName")
            .sort({ requestedAt: -1 })
            .limit(100)
            .lean(),
        ]);
        const revenue = transactions
          .filter((t: any) => t.status === "completed")
          .reduce((s: number, t: any) => s + (t.amount || 0), 0);

        const { buffer, filename } = await buildBillingReportPdf({
          title: "Facility Billing Report",
          generatedFor: party,
          summary: {
            Revenue: fmtZAR(revenue),
            Transactions: transactions.length,
            Payouts: payouts.length,
            Pending: payouts.filter((p: any) => p.status === "pending")
              .length,
          },
          transactions: transactions as any,
          payouts: payouts.map((p: any) => ({
            amount: p.amount,
            status: p.status,
            consultationCount: p.consultationCount,
            periodFrom: p.periodFrom,
            periodTo: p.periodTo,
            requestedAt: p.requestedAt,
            practitionerName: p.practitionerId
              ? `${p.practitionerId.firstName || ""} ${p.practitionerId.lastName || ""}`.trim()
              : undefined,
          })),
        });
        return pdfResponse(buffer, filename);
      }

      // Admin / inspector platform report
      if (
        ["super_admin", "mega_admin", "inspector"].includes(role)
      ) {
        const [transactions, payouts] = await Promise.all([
          PaymentTransaction.find({})
            .sort({ timestamp: -1 })
            .limit(300)
            .lean(),
          PayoutRequest.find({})
            .populate("practitionerId", "firstName lastName")
            .sort({ requestedAt: -1 })
            .limit(150)
            .lean(),
        ]);
        const totalRevenue = transactions
          .filter((t: any) => t.status === "completed")
          .reduce((s: number, t: any) => s + (t.amount || 0), 0);
        const platformFees = transactions
          .filter((t: any) => t.status === "completed")
          .reduce(
            (s: number, t: any) => s + (t.platformFeeAmount || 0),
            0,
          );

        const { buffer, filename } = await buildBillingReportPdf({
          title: "Platform Finance Report",
          generatedFor: party,
          summary: {
            "Gross revenue": fmtZAR(totalRevenue),
            "Platform fees": fmtZAR(platformFees),
            Transactions: transactions.length,
            Payouts: payouts.length,
          },
          transactions: transactions as any,
          payouts: payouts.map((p: any) => ({
            amount: p.amount,
            status: p.status,
            consultationCount: p.consultationCount,
            periodFrom: p.periodFrom,
            periodTo: p.periodTo,
            requestedAt: p.requestedAt,
            practitionerName: p.practitionerId
              ? `${p.practitionerId.firstName || ""} ${p.practitionerId.lastName || ""}`.trim()
              : undefined,
          })),
        });
        return pdfResponse(buffer, filename);
      }

      return NextResponse.json(
        { error: "No report available for this role" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        error:
          'Invalid type. Use "receipt", "invoice", or "report".',
      },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("[POST /api/billing/export]", err);
    return NextResponse.json(
      { error: err.message || "Failed to export PDF" },
      { status: 500 },
    );
  }
}
