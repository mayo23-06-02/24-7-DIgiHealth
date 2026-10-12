import { MedicalInvoice, type IMedicalInvoice, type MedicalInvoiceStatus } from "@/lib/models/MedicalInvoice";
import { Facility } from "@/lib/models/Facility";
import { FacilityPatient, FacilityPatientProfile } from "@/lib/models/FacilityPatient";
import { PatientProfile, PractitionerProfile } from "@/lib/models/RoleProfiles";
import { Notification } from "@/lib/models/Communications";
import FamilyLink from "@/lib/models/FamilyLink";
import User from "@/lib/models/User";
import { Consultation } from "@/lib/models/Consultation";
import { sharedFacilityIds } from "@/lib/facility/membership";
import { resolveHospitalId } from "@/lib/hospital/resolveHospitalId";
import { isPlatformAdmin } from "@/lib/auth/adminRoles";
import { PublicError } from "@/lib/api/errors";
import { resolveRecipientById } from "@/lib/email/recipients";
import { sendEmail } from "@/lib/email/resend";
import { appOrigin, escapeHtml, renderEmail } from "@/lib/email/layout";
import { isValidId, toId } from "@/lib/db";

export const INVOICE_STATUSES: MedicalInvoiceStatus[] = [
  "issued",
  "submitted",
  "paid",
  "partially_paid",
  "rejected",
  "cancelled",
];

export const MAX_INVOICE_ITEMS = 50;

interface Caller {
  userId: string;
  role: string;
  email?: string;
}

export interface InvoiceItemInput {
  tariffCode?: string;
  icd10Code?: string;
  description?: string;
  quantity?: number | string;
  unitPrice?: number | string;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** ICD-10 as SA medical aids accept it: letter, two digits, optional dot and up to 4 more. */
const ICD10 = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/;

export function parseItems(raw: unknown): IMedicalInvoice["items"] {
  if (!Array.isArray(raw) || raw.length === 0) throw new PublicError("Add at least one line item.");
  if (raw.length > MAX_INVOICE_ITEMS) throw new PublicError(`An invoice can have at most ${MAX_INVOICE_ITEMS} lines.`);
  return raw.map((r: InvoiceItemInput, i) => {
    const line = i + 1;
    const description = clip(r?.description, 300);
    const tariffCode = clip(r?.tariffCode, 20).toUpperCase();
    const icd10Code = clip(r?.icd10Code, 60).toUpperCase().replace(/\s+/g, "");
    const quantity = Number(r?.quantity ?? 1);
    const unitPrice = Number(r?.unitPrice);
    if (!description) throw new PublicError(`Line ${line}: add a description.`);
    if (!tariffCode) throw new PublicError(`Line ${line}: add a tariff code.`);
    if (!icd10Code) throw new PublicError(`Line ${line}: add an ICD-10 code.`);
    for (const code of icd10Code.split(/[,;/]/).filter(Boolean)) {
      if (!ICD10.test(code)) throw new PublicError(`Line ${line}: "${code}" is not a valid ICD-10 code (e.g. J06.9).`);
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000) {
      throw new PublicError(`Line ${line}: quantity must be between 1 and 1000.`);
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1_000_000) {
      throw new PublicError(`Line ${line}: enter a valid unit price.`);
    }
    const unit = round2(unitPrice);
    return {
      position: i,
      tariffCode,
      icd10Code: icd10Code.replace(/[;/]/g, ","),
      description,
      quantity,
      unitPrice: unit,
      amount: round2(quantity * unit),
    };
  });
}

/** Hospitals this doctor and patient share where medical-aid billing is switched on. */
export async function billingFacilities(practitionerId: string, patientId: string) {
  const shared = await sharedFacilityIds(patientId, practitionerId);
  if (!shared.length) return [];
  const rows = await Facility.find({ _id: { $in: shared }, medicalAidBillingEnabled: true })
    .select("name address")
    .lean();
  return rows.map((f) => ({ id: toId(f._id)!, name: f.name, address: formatAddress(f.address) }));
}

export function formatAddress(a?: { street?: string; city?: string; province?: string } | null): string {
  return [a?.street, a?.city, a?.province].filter(Boolean).join(", ");
}

/** Medical aid on file: the hospital's own record first, then the patient's profile. */
export async function medicalAidOnFile(patientId: string, facilityId: string) {
  const file = await FacilityPatient.findOne({ patientId, facilityId }).select("_id").lean();
  const fp = file
    ? await FacilityPatientProfile.findOne({ facilityPatientId: toId(file._id) }).select("medicalAid").lean()
    : null;
  const pp = await PatientProfile.findOne({ userId: patientId }).select("medicalAid idNumber").lean();
  const fromFile = fp?.medicalAid?.provider ? fp.medicalAid : null;
  const aid = fromFile ?? pp?.medicalAid ?? null;
  return {
    provider: aid?.provider || "",
    planName: aid?.planName || "",
    memberNumber: aid?.memberNumber || "",
    idNumber: pp?.idNumber || "",
  };
}

export async function createMedicalInvoice(
  practitionerId: string,
  body: Record<string, unknown>,
): Promise<IMedicalInvoice> {
  const patientId = String(body.patientId ?? "");
  const facilityId = String(body.facilityId ?? "");
  if (!isValidId(patientId)) throw new PublicError("Choose a patient.");
  if (!isValidId(facilityId)) throw new PublicError("Choose the hospital this invoice is from.");

  const allowed = await billingFacilities(practitionerId, patientId);
  const facility = allowed.find((f) => f.id === facilityId);
  if (!facility) {
    throw new PublicError(
      "You can only invoice patients at a hospital where you both have an active file and medical aid billing is on.",
      403,
    );
  }

  const serviceDate = body.serviceDate ? new Date(String(body.serviceDate)) : new Date();
  if (Number.isNaN(serviceDate.getTime())) throw new PublicError("Enter a valid service date.");
  if (serviceDate.getTime() > Date.now() + 24 * 3600_000) throw new PublicError("The service date cannot be in the future.");

  const consultationId = body.consultationId ? String(body.consultationId) : undefined;
  if (consultationId) {
    const ok = isValidId(consultationId) && (await Consultation.exists({ _id: consultationId, patientId, practitionerId }));
    if (!ok) throw new PublicError("That appointment is not between you and this patient.");
  }

  const items = parseItems(body.items);
  const total = round2(items.reduce((s, i) => s + i.amount, 0));

  const [patient, doctor, doctorProfile, aid] = await Promise.all([
    User.findById(patientId).select("firstName lastName").lean(),
    User.findById(practitionerId).select("firstName lastName").lean(),
    PractitionerProfile.findOne({ userId: practitionerId }).select("hpcsaNumber practiceNumber").lean(),
    medicalAidOnFile(patientId, facilityId),
  ]);
  if (!patient) throw new PublicError("Patient not found.", 404);

  const name = (u?: { firstName?: string; lastName?: string } | null) =>
    [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();

  return MedicalInvoice.create({
    facilityId,
    practitionerId,
    patientId,
    consultationId,
    status: "issued",
    serviceDate,
    patientName: name(patient) || "Patient",
    patientIdNumber: aid.idNumber || undefined,
    medicalAidProvider: clip(body.medicalAidProvider, 120) || aid.provider || undefined,
    medicalAidPlan: clip(body.medicalAidPlan, 120) || aid.planName || undefined,
    medicalAidMemberNumber: clip(body.medicalAidMemberNumber, 60) || aid.memberNumber || undefined,
    dependantCode: clip(body.dependantCode, 10) || undefined,
    practitionerName: `Dr ${name(doctor)}`.trim(),
    hpcsaNumber: doctorProfile?.hpcsaNumber && doctorProfile.hpcsaNumber !== "N/A" ? doctorProfile.hpcsaNumber : undefined,
    practiceNumber: doctorProfile?.practiceNumber || undefined,
    facilityName: facility.name,
    notes: clip(body.notes, 2000) || undefined,
    total,
    currency: "ZAR",
    issuedAt: new Date(),
    items,
  } as Partial<IMedicalInvoice>) as Promise<IMedicalInvoice>;
}

/** Patients whose invoices this user may see: themselves plus minor dependants they guard. */
export async function viewablePatientIds(userId: string): Promise<string[]> {
  const links = await FamilyLink.find({ guardianId: userId, status: "active", isMinor: true })
    .select("memberId")
    .lean();
  return [userId, ...links.map((l) => toId(l.memberId)).filter((x): x is string => !!x)];
}

export async function canViewInvoice(caller: Caller, inv: Pick<IMedicalInvoice, "patientId" | "practitionerId" | "facilityId">) {
  const patientId = toId(inv.patientId);
  if (isPlatformAdmin(caller.role)) return true;
  if (toId(inv.practitionerId) === caller.userId) return true;
  if (caller.role === "hospital_admin") {
    const fid = await resolveHospitalId(caller.userId, caller.email);
    return !!fid && fid === toId(inv.facilityId);
  }
  if (!patientId) return false;
  return (await viewablePatientIds(caller.userId)).includes(patientId);
}

/** What the API sends to clients. */
export function invoiceView(inv: IMedicalInvoice) {
  return {
    id: toId(inv._id),
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    serviceDate: inv.serviceDate,
    issuedAt: inv.issuedAt,
    statusChangedAt: inv.statusChangedAt ?? null,
    patientId: toId(inv.patientId),
    patientName: inv.patientName,
    practitionerId: toId(inv.practitionerId),
    practitionerName: inv.practitionerName,
    facilityId: toId(inv.facilityId),
    facilityName: inv.facilityName,
    consultationId: toId(inv.consultationId) ?? null,
    medicalAidProvider: inv.medicalAidProvider ?? null,
    medicalAidPlan: inv.medicalAidPlan ?? null,
    medicalAidMemberNumber: inv.medicalAidMemberNumber ?? null,
    dependantCode: inv.dependantCode ?? null,
    hpcsaNumber: inv.hpcsaNumber ?? null,
    practiceNumber: inv.practiceNumber ?? null,
    notes: inv.notes ?? null,
    total: Number(inv.total),
    currency: inv.currency,
    items: (inv.items ?? []).map((i) => ({
      tariffCode: i.tariffCode,
      icd10Code: i.icd10Code,
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      amount: Number(i.amount),
    })),
    pdfUrl: `/api/invoices/${toId(inv._id)}/pdf`,
  };
}

const zar = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n) || 0);

/**
 * Tell the patient (or the guardian of a minor) an invoice is waiting, in the app and by email.
 * Best-effort: issuing never fails because a notification could not be sent.
 */
export async function notifyInvoiceIssued(inv: IMedicalInvoice): Promise<void> {
  const invoiceId = toId(inv._id)!;
  const patientId = toId(inv.patientId)!;
  const billingUrl = `/patient/billing?invoice=${invoiceId}`;
  const pdfUrl = `/api/invoices/${invoiceId}/pdf`;

  let recipientId = patientId;
  try {
    const link = await FamilyLink.findOne({ memberId: patientId, status: "active", isMinor: true })
      .select("guardianId")
      .lean();
    if (link?.guardianId) recipientId = toId(link.guardianId)!;
  } catch (err) {
    console.warn("[invoices] guardian lookup failed:", err);
  }
  const forDependant = recipientId !== patientId;

  try {
    await Notification.create({
      userId: recipientId,
      type: "medical_invoice",
      title: `New invoice from ${inv.practitionerName}`,
      body: `${inv.invoiceNumber} · ${zar(inv.total)}${forDependant ? ` for ${inv.patientName}` : ""}. Download it for your medical aid.`,
      data: { invoiceId, url: billingUrl, pdfUrl, invoiceNumber: inv.invoiceNumber },
      isRead: false,
      deliveredVia: ["in_app", "email"],
    });
  } catch (err) {
    console.warn("[invoices] notification failed:", err);
  }

  try {
    const recipient = await resolveRecipientById(patientId);
    if (!recipient?.email) return;
    const link = `${appOrigin()}${billingUrl}`;
    const html = renderEmail({
      preheader: `Invoice ${inv.invoiceNumber} for ${zar(inv.total)} is ready to download.`,
      eyebrow: "Medical aid invoice",
      title: "Your invoice is ready",
      icon: "&#128196;",
      greeting: recipient.recipientName ? `Dear ${escapeHtml(recipient.recipientName)},` : undefined,
      paragraphs: [
        recipient.onBehalfOf
          ? `${escapeHtml(inv.practitionerName)} issued an invoice for ${escapeHtml(recipient.onBehalfOf)}'s visit at ${escapeHtml(inv.facilityName)}.`
          : `${escapeHtml(inv.practitionerName)} issued an invoice for your visit at ${escapeHtml(inv.facilityName)}.`,
        "Download it from your Billing page and submit it to your medical aid, or settle it with the practice.",
      ],
      details: [
        ["Invoice number", inv.invoiceNumber],
        ["Service date", new Date(inv.serviceDate).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })],
        ["Medical aid", [inv.medicalAidProvider, inv.medicalAidMemberNumber].filter(Boolean).join(" · ") || "Not on file"],
        ["Total", zar(inv.total)],
      ],
      cta: { label: "Download your invoice", url: link },
      notes: ["You will be asked to sign in before the download starts."],
    });
    const { error } = await sendEmail({
      to: recipient.email,
      subject: `Invoice ${inv.invoiceNumber} from ${inv.practitionerName}`,
      html,
    });
    if (error) console.warn("[invoices] email failed:", error);
  } catch (err) {
    console.warn("[invoices] email threw:", err);
  }
}

/** Allowed status moves. Cancelling is only possible before the claim goes to the medical aid. */
export function canMoveStatus(from: MedicalInvoiceStatus, to: MedicalInvoiceStatus): boolean {
  if (from === to) return false;
  if (from === "cancelled") return false;
  if (to === "cancelled") return from === "issued";
  if (to === "issued") return false;
  return true;
}
