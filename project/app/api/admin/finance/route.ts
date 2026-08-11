import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PaymentTransaction, PayoutRequest } from "@/lib/models/Billing";
import HospitalTransaction from "@/lib/models/HospitalTransaction";
import { requirePlatformAdmin, isMegaAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/logAdminAction";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();

    const days = Math.min(
      90,
      Math.max(7, parseInt(req.nextUrl.searchParams.get("days") || "30", 10)),
    );
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [payAgg, htxAgg, payouts, recentPays] = await Promise.all([
      PaymentTransaction.aggregate([
        { $match: { status: "completed", timestamp: { $gte: since } } },
        {
          $group: {
            _id: null,
            gmv: { $sum: "$amount" },
            fees: { $sum: { $ifNull: ["$platformFeeAmount", 0] } },
            earnings: { $sum: { $ifNull: ["$practitionerEarnings", 0] } },
            count: { $sum: 1 },
          },
        },
      ]),
      HospitalTransaction.aggregate([
        { $match: { status: "paid", timestamp: { $gte: since } } },
        { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      PayoutRequest.find().sort({ requestedAt: -1 }).limit(50).lean(),
      PaymentTransaction.find({ timestamp: { $gte: since } })
        .sort({ timestamp: -1 })
        .limit(40)
        .lean(),
    ]);

    const pending = (payouts as any[]).filter((p) => p.status === "pending");

    return NextResponse.json({
      success: true,
      data: {
        periodDays: days,
        summary: {
          gmv: Math.round((payAgg[0]?.gmv || 0) + (htxAgg[0]?.amount || 0)),
          platformFees: Math.round(payAgg[0]?.fees || 0),
          practitionerEarnings: Math.round(payAgg[0]?.earnings || 0),
          hospitalRevenue: Math.round(htxAgg[0]?.amount || 0),
          transactionCount: (payAgg[0]?.count || 0) + (htxAgg[0]?.count || 0),
          pendingPayouts: pending.length,
          pendingAmount: Math.round(
            pending.reduce((s, p) => s + (p.amount || 0), 0),
          ),
        },
        payouts: (payouts as any[]).map((p) => ({
          id: p._id.toString(),
          amount: p.amount || 0,
          status: p.status,
          practitionerId: p.practitionerId?.toString(),
          facilityId: p.facilityId?.toString(),
          requestedAt: p.requestedAt,
          consultationCount: p.consultationCount || 0,
        })),
        transactions: (recentPays as any[]).map((t) => ({
          id: t._id.toString(),
          amount: t.amount || 0,
          status: t.status,
          category: t.category,
          provider: t.provider,
          timestamp: t.timestamp,
          fees: t.platformFeeAmount || 0,
        })),
      },
    });
  } catch (err: any) {
    console.error("[GET /api/admin/finance]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();
    const body = await req.json();
    const { payoutId, status } = body;
    if (!payoutId || !["approved", "paid", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    // Marking a payout "paid" states money has actually left the platform —
    // reserve that irreversible step for mega_admin, same as other high-trust actions.
    if (status === "paid" && !isMegaAdmin(gate.user.role)) {
      return NextResponse.json(
        { error: "Only mega admin can mark a payout as paid" },
        { status: 403 },
      );
    }
    const payout = await PayoutRequest.findById(payoutId);
    if (!payout) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    }
    payout.status = status;
    if (status === "approved" || status === "paid" || status === "rejected") {
      payout.processedAt = new Date();
      payout.approvedBy = gate.user.userId as any;
    }
    await payout.save();

    await logAdminAction({
      actor: gate.user,
      action: `payout.${status}`,
      targetType: "payout",
      targetId: payoutId,
    });

    return NextResponse.json({ success: true, data: { id: payoutId, status } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
