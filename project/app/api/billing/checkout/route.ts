import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { Subscription, PaymentTransaction } from "@/lib/models/Billing";
import { TIER_CONFIG, isValidTier } from "@/lib/billing/tiers";
import { getEntitlement, subscriptionFilter } from "@/lib/billing/entitlement";
import {
  chargeMockCard,
  chargeMockDebitOrder,
  validateCard,
  validateBankAccount,
  validateBillingAddress,
} from "@/lib/billing/mockGateway";
import { isMongoObjectId } from "@/lib/utils/mongoId";
import { signSessionToken, setSessionCookie } from "@/lib/auth/sessionToken";
import { apiError } from "@/lib/api/errors";

/**
 * GET /api/billing/checkout — what the checkout page needs to render.
 * Returns the plans on offer and the caller's current entitlement.
 */
export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entitlement = await getEntitlement(user.userId);

    return NextResponse.json({
      success: true,
      data: {
        entitlement,
        // Straight from TIER_CONFIG so checkout can never quote a different
        // price than the public pricing page.
        plans: Object.values(TIER_CONFIG).map((t) => ({
          id: t.id,
          label: t.label,
          price: t.price,
          maxFamilyMembers: t.maxFamilyMembers,
          consultationsMax: Number.isFinite(t.consultationsMax)
            ? t.consultationsMax
            : null,
        })),
      },
    });
  } catch (err) {
    return apiError(err, "Could not load checkout.");
  }
}

/**
 * POST /api/billing/checkout — pay for a plan.
 *
 * The charge is simulated (see lib/billing/mockGateway.ts); everything either
 * side of it is real. On success the session token is re-issued carrying
 * `hasPlan: true`, which is what releases the middleware gate — without that
 * the user would pay and still be redirected back to checkout.
 */
export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "patient") {
      return NextResponse.json(
        { error: "Only patient accounts hold a plan." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { tier, card, billing } = body as {
      tier?: string;
      card?: any;
      billing?: any;
      method?: string;
    };
    const method = body?.method === "eft" ? "eft" : "card";

    if (!tier || !isValidTier(tier)) {
      return NextResponse.json(
        { error: "Choose a plan to continue." },
        { status: 400 },
      );
    }

    // Validated per method — a card form's rules would reject every valid
    // bank account and vice versa.
    const fieldErrors = {
      ...(method === "card"
        ? validateCard(card || {})
        : validateBankAccount(card || {})),
      ...validateBillingAddress(billing || {}),
    };
    if (Object.keys(fieldErrors).length) {
      return NextResponse.json(
        {
          error:
            method === "card"
              ? "Check your card and billing details."
              : "Check your bank and billing details.",
          fieldErrors,
        },
        { status: 400 },
      );
    }

    const plan = TIER_CONFIG[tier];

    // The amount charged is read from the server's own config, never from the
    // request. A price in the payload would let a caller pay what they liked.
    const payment =
      method === "card"
        ? await chargeMockCard(card, plan.price)
        : await chargeMockDebitOrder(card, plan.price);
    if (!payment.ok) {
      return NextResponse.json({ error: payment.error }, { status: 402 });
    }

    await connectToDatabase();

    const now = new Date();
    const nextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const key = String(user.userId);

    const sub = await Subscription.findOneAndUpdate(
      subscriptionFilter(key),
      {
        // patientKey works for both id shapes; patientId is only set when the
        // id can actually be cast to an ObjectId.
        patientKey: key,
        ...(isMongoObjectId(key) ? { patientId: key } : {}),
        tier,
        status: "active",
        price: plan.price,
        autoRenew: true,
        startDate: now,
        nextBillingDate,
        paymentMethodId: payment.reference,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Recorded so the purchase shows in billing history. The previous
    // upgrade path wrote no transaction at all, so a paid plan left no trace
    // on the billing page.
    await PaymentTransaction.create({
      patientKey: key,
      ...(isMongoObjectId(key) ? { patientId: key } : {}),
      amount: plan.price,
      currency: "ZAR",
      provider: method === "card" ? "card" : "eft",
      status: "completed",
      description: `${plan.label} plan — monthly subscription`,
      category: "subscription",
      providerTransactionId: payment.reference,
      timestamp: now,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        tier,
        price: plan.price,
        reference: payment.reference,
        last4: payment.last4,
        brand: payment.brand,
        nextBillingDate: nextBillingDate.toISOString(),
        subscriptionId: String((sub as any)?._id ?? ""),
      },
    });

    const token = await signSessionToken({
      userId: user.userId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      hasPlan: true,
    });
    return setSessionCookie(response, token);
  } catch (err) {
    return apiError(err, "Payment could not be completed.");
  }
}
