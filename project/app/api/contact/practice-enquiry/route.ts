import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import { escapeHtml, renderEmail } from "@/lib/email/layout";
import { normalizePhoneZa } from "@/lib/phone/normalizePhone";
import { SA_PROVINCES } from "@/lib/geo/provinces";
import { checkLocalRateLimit } from "@/lib/security/rateLimit";
import {
  PRACTICE_ENQUIRY_INBOX,
  PRACTICE_NEXT_STEPS,
  PRACTICE_SIZES,
  PRACTICE_SPECIALITIES,
} from "@/lib/leads/practiceEnquiry";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const oneOf = <T extends readonly string[]>(list: T, v: string) => (list as readonly string[]).includes(v);

/** Ad-tracking fields we pass through to the admin email so leads can be traced to a campaign. */
const TRACKING_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;

/**
 * POST — a practitioner's "Digitise Your Medical Practice" enquiry from the
 * public /digitise-practice page (the Meta ad landing page). Nothing is stored;
 * the enquiry is emailed to the admin inbox.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    if (!checkLocalRateLimit(`practice-enquiry:${ip}`, { windowMs: 10 * 60_000, maxRequests: 5 })) {
      return NextResponse.json(
        { success: false, error: "Too many enquiries from this connection. Please try again in a few minutes." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));

    // Honeypot: real visitors never see or fill this field.
    if (clip(body.website, 200)) return NextResponse.json({ success: true });

    const fullName = clip(body.fullName, 120);
    const practiceName = clip(body.practiceName, 160);
    const speciality = clip(body.speciality, 60);
    const province = clip(body.province, 40);
    const email = clip(body.email, 160).toLowerCase();
    const phone = normalizePhoneZa(clip(body.phone, 30));
    const practiceSize = clip(body.practiceSize, 40);
    const nextStep = clip(body.nextStep, 60);

    const errors: Record<string, string> = {};
    if (fullName.length < 2) errors.fullName = "Enter your full name.";
    if (practiceName.length < 2) errors.practiceName = "Enter your practice or medical centre name.";
    if (!oneOf(PRACTICE_SPECIALITIES, speciality)) errors.speciality = "Choose your medical speciality.";
    if (!oneOf(SA_PROVINCES, province)) errors.province = "Choose your province.";
    if (!EMAIL.test(email)) errors.email = "Enter a valid email address.";
    if (!phone) errors.phone = "Enter a South African mobile number, e.g. 082 123 4567.";
    if (!oneOf(PRACTICE_SIZES, practiceSize)) errors.practiceSize = "Choose your practice size.";
    if (!oneOf(PRACTICE_NEXT_STEPS, nextStep)) errors.nextStep = "Choose how you would like to proceed.";
    if (body.consent !== true) errors.consent = "Please agree to be contacted so we can respond.";
    if (Object.keys(errors).length) {
      return NextResponse.json({ success: false, error: "Please check the highlighted fields.", errors }, { status: 400 });
    }

    const tracking = TRACKING_KEYS.map((k) => [k, clip(body.tracking?.[k], 200)] as const).filter(([, v]) => v);
    const submitted = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });

    const html = renderEmail({
      preheader: `${fullName} (${practiceName}) wants to: ${nextStep}`,
      eyebrow: "Practice enquiry",
      title: nextStep,
      icon: "&#129658;",
      paragraphs: [
        `<strong>${escapeHtml(fullName)}</strong> from <strong>${escapeHtml(practiceName)}</strong> completed the Digitise Your Medical Practice form.`,
        "They agreed to be contacted about their enquiry.",
      ],
      details: [
        ["Full name", fullName],
        ["Practice / medical centre", practiceName],
        ["Speciality", speciality],
        ["Province", province],
        ["Email", email],
        ["Mobile / WhatsApp", phone!.e164],
        ["Practice size", practiceSize],
        ["Wants to", nextStep],
        ["Submitted", `${submitted} (SAST)`],
        ...tracking.map(([k, v]) => [k, v] as [string, string]),
      ],
      cta: { label: `Reply to ${fullName}`, url: `mailto:${encodeURIComponent(email)}` },
      notes: [`WhatsApp: <a href="https://wa.me/${phone!.e164.slice(1)}">${escapeHtml(phone!.e164)}</a>`],
      signoff: false,
    });

    const { error } = await sendEmail({
      to: PRACTICE_ENQUIRY_INBOX,
      subject: `Practice enquiry: ${practiceName} (${nextStep})`,
      html,
    });
    if (error) {
      console.error("[POST /api/contact/practice-enquiry]", error);
      return NextResponse.json(
        { success: false, error: "We couldn't send your enquiry right now. Please try again shortly." },
        { status: 502 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/contact/practice-enquiry]", err);
    return NextResponse.json({ success: false, error: "Failed to send enquiry." }, { status: 500 });
  }
}
