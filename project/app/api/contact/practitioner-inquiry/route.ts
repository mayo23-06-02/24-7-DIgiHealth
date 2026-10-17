import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/emailjs";

/**
 * POST — a patient or practitioner enquiry from /contact. No account is
 * created; the message is emailed to the admin inbox.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Name, email, and message are required." },
        { status: 400 },
      );
    }

    const inbox = process.env.CLINICAL_TEAM_EMAIL?.trim() || "admin@digi-health.co.za";

    const { error } = await sendEmail({
      to: inbox,
      subject: `Enquiry: ${name}`,
      html: `
        <h2>New enquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong><br/>${escapeHtml(message)}</p>
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
