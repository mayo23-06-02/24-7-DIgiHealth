import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/postmark";

/**
 * POST — a practitioner reaching out via the /doctors page's "Contact Our
 * Team" CTA. This is the one doctor-facing entry point on the whole
 * marketing site by design (see app/doctors/page.tsx) — practitioners
 * otherwise join through direct outreach, not self-serve signup, so this
 * just notifies the clinical team rather than creating an account.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const hpcsaNumber = String(body.hpcsaNumber || "").trim();
    const specialty = String(body.specialty || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !hpcsaNumber || !specialty) {
      return NextResponse.json(
        { success: false, error: "Name, email, HPCSA number, and specialty are required." },
        { status: 400 },
      );
    }

    const inbox = process.env.CLINICAL_TEAM_EMAIL || process.env.MAILJET_FROM_EMAIL || "hello@247digihealth.com";

    const { error } = await sendEmail({
      to: inbox,
      subject: `Practitioner inquiry: ${name} (${specialty})`,
      html: `
        <h2>New practitioner inquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>HPCSA number:</strong> ${escapeHtml(hpcsaNumber)}</p>
        <p><strong>Specialty:</strong> ${escapeHtml(specialty)}</p>
        <p><strong>Message:</strong><br/>${escapeHtml(message || "(none)")}</p>
      `,
    });

    if (error) {
      console.error("[POST /api/contact/practitioner-inquiry]", error);
      return NextResponse.json(
        { success: false, error: "We couldn't send your inquiry right now. Please try again shortly." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/contact/practitioner-inquiry]", err);
    return NextResponse.json({ success: false, error: "Failed to send inquiry." }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
