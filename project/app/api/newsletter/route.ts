import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import NewsletterSubscriber from "@/lib/models/NewsletterSubscriber";
import { normalizeEmail, isValidEmail } from "@/lib/supabase/auth";

/**
 * POST /api/newsletter — footer "Stay ahead of your health journey" capture.
 *
 * Public and unauthenticated by design (see proxy.ts allowlist). Previously the
 * footer form called preventDefault() and did nothing at all, so every visitor
 * who submitted got silence and nothing was stored.
 *
 * Re-subscribing an existing address is a success, not a conflict — and the
 * response is deliberately identical either way, so this endpoint can't be used
 * to probe whether a given address is already on the list.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(String(body?.email || ""));
    const source = String(body?.source || "footer").slice(0, 60);

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    await NewsletterSubscriber.findOneAndUpdate(
      { email },
      { $set: { source, unsubscribedAt: null }, $setOnInsert: { email } },
      { upsert: true, new: true },
    );

    return NextResponse.json({ success: true, message: "You're subscribed." });
  } catch (err: unknown) {
    // Log server-side; return something generic so a storage failure never
    // exposes internals to an anonymous caller.
    console.error("[POST /api/newsletter]", err);
    return NextResponse.json(
      { success: false, error: "We couldn't sign you up right now. Please try again." },
      { status: 500 },
    );
  }
}
