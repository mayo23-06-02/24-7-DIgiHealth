import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  PaymentTransaction,
  Subscription,
  PayoutRequest,
  PaymentMethod,
  PlatformFeeConfig,
  HospitalRevenue,
  BillingAuditLog,
} from "@/lib/models/Billing";
import { Facility } from "@/lib/models/Facility";

import Consultation from "@/lib/models/Consultation";
import { TIER_CONFIG, isValidTier } from "@/lib/billing/tiers";
import { subscriptionFilter } from "@/lib/billing/entitlement";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { isMongoObjectId } from "@/lib/utils/mongoId";

import { apiError } from "@/lib/api/errors";
async function getAuthUser() {
  const requestUser = await getRequestUser();
  if (!requestUser) return null;
  // Postgres-native accounts have no Mongo `User` row (see
  // lib/utils/mongoId.ts) — this shape is compatible with every `user._id`/
  // `user.role` read below without touching Mongo for identity.
  return {
    _id: requestUser.userId,
    role: requestUser.role,
    email: requestUser.email,
    firstName: requestUser.firstName,
    lastName: requestUser.lastName,
  } as any;
}

// ─── GET /api/billing ──────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const role = user.role as string;

    // ── Patient View ──────────────────────────────────────────────────────────
    if (role === "patient") {
      // Postgres-native accounts used to get an early return here that
      // fabricated an "active individual" subscription. That made this page
      // claim a plan the account did not hold — and now that access depends on
      // holding one, it would have contradicted the gate outright. Both id
      // shapes are queried for real instead; an account with nothing simply
      // gets nothing.
      const ownerFilter = subscriptionFilter(String(user._id));

      const [transactions, subscription, paymentMethods] = await Promise.all([
        PaymentTransaction.find(ownerFilter)
          .sort({ timestamp: -1 })
          .limit(50)
          .lean(),
        Subscription.findOne(ownerFilter)
          .sort({ createdAt: -1 })
          .lean(),
        // Payment methods are still ObjectId-keyed only; a uuid filter would
        // match nothing, which is the correct answer for those accounts.
        isMongoObjectId(user._id)
          ? PaymentMethod.find({ patientId: user._id }).lean()
          : Promise.resolve([]),
      ]);

      // Count consultations completed since subscription started (or fallback last 30 days)
      const startDate = subscription?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const consultationsUsed = await Consultation.countDocuments({
        patientId: user._id,
        status: "completed",
        scheduledStartTime: { $gte: startDate }
      });

      // Calculate max consultations based on subscription tier
      const rawTier: string | undefined = subscription?.tier;
      const tier = rawTier && isValidTier(rawTier) ? rawTier : "individual";
      const tierConfig = TIER_CONFIG[tier];
      const consultationsMax = Number.isFinite(tierConfig.consultationsMax) ? tierConfig.consultationsMax : 999;
      const chatsMax = 999; // AI-triage chats are unmetered today regardless of tier

      // Summarize
      const completed = transactions.filter(
        (t: any) => t.status === "completed",
      );
      const totalSpent = completed.reduce(
        (s: number, t: any) => s + t.amount,
        0,
      );
      const pending = transactions.filter(
        (t: any) => t.status === "pending",
      ).length;

      // Placeholder for an account that has never bought a plan. It reports
      // "none" rather than the "active individual" this used to claim: with
      // access now depending on holding a plan, a billing page saying the
      // patient has one while the gate says otherwise is the worst outcome.
      // `tier` is still populated so the UI's tier lookup has something to
      // match, but the status is honest.
      const activeSubscription = subscription || {
        patientId: user._id,
        tier: "individual",
        status: "none",
        startDate: null,
        nextBillingDate: null,
        price: 0,
        autoRenew: false,
      };

      return NextResponse.json({
        role: "patient",
        summary: {
          totalSpent,
          pendingCount: pending,
          completedCount: completed.length,
        },
        transactions,
        subscription: activeSubscription,
        paymentMethods,
        utilization: {
          consultationsUsed,
          consultationsMax,
          chatsUsed: 2, // Mock chats usage count for demo
          chatsMax,
        }
      });
    }

    // ── Practitioner View ─────────────────────────────────────────────────────
    if (role === "practitioner") {
      const [payoutRequests, transactions] = await Promise.all([
        PayoutRequest.find({ practitionerId: user._id })
          .sort({ requestedAt: -1 })
          .lean(),
        PaymentTransaction.find({ practitionerId: user._id })
          .sort({ timestamp: -1 })
          .limit(100)
          .lean(),
      ]);

      const paid = payoutRequests.filter((p: any) => p.status === "paid");
      const pending = payoutRequests.filter((p: any) => p.status === "pending");
      const totalPaid = paid.reduce((s: number, p: any) => s + p.amount, 0);
      const totalPending = pending.reduce(
        (s: number, p: any) => s + p.amount,
        0,
      );
      const totalEarned = transactions
        .filter((t: any) => t.status === "completed")
        .reduce((s: number, t: any) => s + (t.practitionerEarnings || 0), 0);

      // Monthly breakdown for chart (last 6 months)
      const monthlyBreakdown: Record<string, number> = {};
      transactions.forEach((t: any) => {
        if (t.status !== "completed") return;
        const key = new Date(t.timestamp).toLocaleDateString("en-ZA", {
          month: "short",
          year: "2-digit",
        });
        monthlyBreakdown[key] =
          (monthlyBreakdown[key] || 0) + (t.practitionerEarnings || 0);
      });

      return NextResponse.json({
        role: "practitioner",
        summary: {
          totalEarned,
          totalPaid,
          totalPending,
          pendingPayouts: pending.length,
        },
        payoutRequests,
        transactions,
        monthlyBreakdown,
      });
    }

    // ── Hospital Admin View ───────────────────────────────────────────────────
    if (role === "hospital_admin") {
      const [revenues, payoutRequests, facilities] = await Promise.all([
        HospitalRevenue.find({ period: "monthly" })
          .sort({ date: -1 })
          .limit(24)
          .lean(),
        PayoutRequest.find({})
          .populate("practitionerId", "firstName lastName email")
          .sort({ requestedAt: -1 })
          .lean(),
        Facility.find({}).lean(),
      ]);

      const totalRevenue = revenues.reduce(
        (s: number, r: any) => s + r.totalRevenue,
        0,
      );
      const pendingPayouts = payoutRequests.filter(
        (p: any) => p.status === "pending",
      );

      // Aggregate by department across all revenue records
      const deptMap: Record<string, { revenue: number; count: number }> = {};
      revenues.forEach((r: any) => {
        r.byDepartment?.forEach((d: any) => {
          if (!deptMap[d.department])
            deptMap[d.department] = { revenue: 0, count: 0 };
          deptMap[d.department].revenue += d.revenue;
          deptMap[d.department].count += d.transactionCount;
        });
      });
      const departmentBreakdown = Object.entries(deptMap)
        .map(([dept, data]) => ({
          department: dept,
          ...data,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return NextResponse.json({
        role: "hospital_admin",
        summary: { totalRevenue, pendingPayoutCount: pendingPayouts.length },
        revenues,
        payoutRequests,
        departmentBreakdown,
        facilities,
      });
    }

    // ── Super Admin / Mega Admin View ─────────────────────────────────────────
    if (["super_admin", "mega_admin", "inspector"].includes(role)) {
      const [
        allTransactions,
        allPayouts,
        feeConfig,
        auditLogs,
        patientCount,
        practitionerCount,
      ] = await Promise.all([
        PaymentTransaction.find({}).sort({ timestamp: -1 }).limit(200).lean(),
        PayoutRequest.find({})
          .populate("practitionerId", "firstName lastName")
          .sort({ requestedAt: -1 })
          .lean(),
        PlatformFeeConfig.findOne({}).lean(),
        BillingAuditLog.find({})
          .populate("actorId", "firstName lastName role")
          .sort({ timestamp: -1 })
          .limit(50)
          .lean(),
        User.countDocuments({ role: "patient" }),
        User.countDocuments({ role: "practitioner" }),
      ]);

      const totalRevenue = allTransactions
        .filter((t: any) => t.status === "completed")
        .reduce((s: number, t: any) => s + t.amount, 0);
      const platformRevenue = allTransactions
        .filter((t: any) => t.status === "completed")
        .reduce((s: number, t: any) => s + (t.platformFeeAmount || 0), 0);
      const pendingPayouts = allPayouts.filter(
        (p: any) => p.status === "pending",
      ).length;

      // Monthly revenue chart (last 12 months)
      const revenueByMonth: Record<string, number> = {};
      allTransactions.forEach((t: any) => {
        if (t.status !== "completed") return;
        const key = new Date(t.timestamp).toLocaleDateString("en-ZA", {
          month: "short",
          year: "2-digit",
        });
        revenueByMonth[key] = (revenueByMonth[key] || 0) + t.amount;
      });

      return NextResponse.json({
        role,
        summary: {
          totalRevenue,
          platformRevenue,
          pendingPayouts,
          patientCount,
          practitionerCount,
        },
        allTransactions,
        allPayouts,
        feeConfig,
        auditLogs,
        revenueByMonth,
      });
    }

    return NextResponse.json(
      { error: "No billing view for this role" },
      { status: 403 },
    );
  } catch (err: any) {
    console.error("[GET /api/billing]", err);
    return apiError(err);
  }
}

// ─── PATCH /api/billing ─ Multi-purpose action endpoint ───────────────────────
export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    await connectToDatabase();

    // Approve / Reject a payout
    if (body.action === "update_payout" && body.payoutId) {
      const payout = await PayoutRequest.findById(body.payoutId);
      if (!payout)
        return NextResponse.json(
          { error: "Payout not found" },
          { status: 404 },
        );
      payout.status = body.status;
      payout.processedAt = new Date();
      payout.approvedBy = user._id;
      payout.notes = body.notes || payout.notes;
      await payout.save();

      await BillingAuditLog.create({
        actorId: user._id,
        actionType:
          body.status === "approved" ? "PAYOUT_APPROVED" : "PAYOUT_REJECTED",
        targetId: payout._id,
        targetModel: "PayoutRequest",
        details: { amount: payout.amount, status: body.status },
      });

      return NextResponse.json({ success: true, payout });
    }

    // Update platform fee
    if (body.action === "update_fee_config") {
      if (!["super_admin", "mega_admin"].includes(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const config = await PlatformFeeConfig.findOneAndUpdate(
        {},
        { ...body.config, updatedBy: user._id },
        { new: true, upsert: true },
      );
      await BillingAuditLog.create({
        actorId: user._id,
        actionType: "PLATFORM_FEE_UPDATED",
        targetId: config._id,
        targetModel: "PlatformFeeConfig",
        details: body.config,
      });
      return NextResponse.json({ success: true, config });
    }

    // Practitioner request a payout
    if (body.action === "request_payout") {
      if (user.role !== "practitioner")
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const payout = await PayoutRequest.create({
        practitionerId: user._id,
        amount: body.amount,
        currency: "ZAR",
        status: "pending",
        requestedAt: new Date(),
        bankAccount: body.bankAccount,
        periodFrom: new Date(body.periodFrom),
        periodTo: new Date(body.periodTo),
        consultationCount: body.consultationCount,
        platformFeeDeducted: body.amount * 0.12,
        notes: body.notes,
      });
      await BillingAuditLog.create({
        actorId: user._id,
        actionType: "PAYOUT_REQUESTED",
        targetId: payout._id,
        targetModel: "PayoutRequest",
        details: { amount: body.amount },
      });
      return NextResponse.json({ success: true, payout });
    }

    // Cancel subscription
    if (body.action === "cancel_subscription") {
      const sub = await Subscription.findOneAndUpdate(
        subscriptionFilter(String(user._id)),
        { status: "cancelled", autoRenew: false },
        { new: true },
      );
      return NextResponse.json({ success: true, subscription: sub });
    }

    // Upgrade subscription
    if (body.action === "upgrade_subscription") {
      const requestedTier: string = body.tier;
      if (!isValidTier(requestedTier)) {
        return NextResponse.json({ error: "Unknown subscription tier" }, { status: 400 });
      }
      const price = TIER_CONFIG[requestedTier].price;
      const sub = await Subscription.findOneAndUpdate(
        subscriptionFilter(String(user._id)),
        {
          patientKey: String(user._id),
          ...(isMongoObjectId(user._id) ? { patientId: user._id } : {}),
          tier: requestedTier,
          status: "active",
          price,
          autoRenew: true,
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        { new: true, upsert: true },
      );
      await BillingAuditLog.create({
        actorId: user._id,
        actionType: "SUBSCRIPTION_UPGRADED",
        targetId: sub._id,
        targetModel: "Subscription",
        details: { tier: body.tier, price },
      });
      return NextResponse.json({ success: true, subscription: sub });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[PATCH /api/billing]", err);
    return apiError(err);
  }
}
