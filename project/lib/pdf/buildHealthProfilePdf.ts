/**
 * DigiHealth branded patient health-profile PDF.
 * Outfit + Space Mono · primary #4493b8 · logo header · doctor signature.
 */
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import Patient from "@/lib/models/Patient";
import { PatientProfile } from "@/lib/models/RoleProfiles";
import {
  MedicalContext,
  Prescription,
  Anthropometric,
  LabResult,
  Immunization,
} from "@/lib/models/ClinicalData";
import BodyAnnotation from "@/lib/models/BodyAnnotation";
import { Consultation } from "@/lib/models/Consultation";
import {
  BRAND,
  createPdfDocument,
  drawBrandLogo,
  hasRoom,
  PAGE_MARGIN,
  pdfToBuffer,
  registerBrandFonts,
  type PdfDoc,
} from "./createPdfDocument";

export interface HealthProfilePdfOptions {
  /** Practitioner issuing/downloading the report */
  doctorId?: string | null;
  doctorName?: string | null;
  /** e.g. HPCSA / registration number */
  doctorCredentials?: string | null;
}

function fmtDate(d: any) {
  if (!d) return "N/A";
  try {
    return new Date(d).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "N/A";
  }
}

function fmtDateTime(d: any) {
  if (!d) return "N/A";
  try {
    return new Date(d).toLocaleString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}

function drawHeader(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  contentW: number,
) {
  const pageW = doc.page.width;
  // Top primary bar
  doc.save();
  doc.rect(0, 0, pageW, 6).fill(BRAND.primary);
  doc.restore();

  // Official Logo-Main.svg (wide wordmark + icon)
  const logoH = 34;
  const { width: logoW, height } = drawBrandLogo(doc, left, 16, {
    height: logoH,
    width: Math.min(contentW * 0.55, 220),
  });

  // Right-side meta (no duplicate brand name when logo is present)
  const metaX = left + Math.max(logoW + 12, 160);
  const metaW = Math.max(80, left + contentW - metaX);
  if (metaW > 60) {
    doc
      .font(fonts.mono)
      .fontSize(7)
      .fillColor(BRAND.muted)
      .text("CLINICAL RECORD", metaX, 22, {
        width: metaW,
        align: "right",
        lineBreak: false,
        characterSpacing: 0.8,
      });
    doc
      .font(fonts.mono)
      .fontSize(7)
      .fillColor(BRAND.primary)
      .text("CONFIDENTIAL", metaX, 34, {
        width: metaW,
        align: "right",
        lineBreak: false,
        characterSpacing: 0.8,
      });
  }

  const yLine = 16 + Math.max(height, logoH) + 10;
  doc
    .moveTo(left, yLine)
    .lineTo(left + contentW, yLine)
    .strokeColor(BRAND.primary)
    .lineWidth(1.25)
    .stroke();
  doc
    .moveTo(left, yLine + 2.5)
    .lineTo(left + 64, yLine + 2.5)
    .strokeColor(BRAND.secondary)
    .lineWidth(2)
    .stroke();

  doc.y = yLine + 12;
}

function drawSignatureBlock(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  contentW: number,
  doctorName: string,
  doctorCredentials?: string | null,
) {
  const blockH = 128;
  // Only add a page if the whole block won't fit above the footer
  if (!hasRoom(doc, blockH + 8)) {
    doc.addPage();
    doc.y = PAGE_MARGIN + 8;
  } else {
    doc.moveDown(0.6);
  }

  doc
    .font(fonts.semi)
    .fontSize(10)
    .fillColor(BRAND.primary)
    .text("Attending clinician", left, doc.y, { lineBreak: false });
  doc.y += 16;

  const boxY = doc.y;
  const boxH = 100;
  doc.save();
  doc.roundedRect(left, boxY, contentW, boxH, 8).fill(BRAND.soft);
  doc.restore();

  const innerX = left + 14;
  const sigLineY = boxY + 48;

  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text("SIGNATURE", innerX, boxY + 12, {
      characterSpacing: 1,
      lineBreak: false,
    });

  doc
    .moveTo(innerX, sigLineY)
    .lineTo(innerX + contentW * 0.42, sigLineY)
    .strokeColor(BRAND.primary)
    .lineWidth(1)
    .stroke();

  doc
    .font(fonts.mono)
    .fontSize(6.5)
    .fillColor(BRAND.muted)
    .text("Sign above", innerX, sigLineY + 4, { lineBreak: false });

  const nameX = left + contentW * 0.5;
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text("CLINICIAN", nameX, boxY + 12, {
      characterSpacing: 1,
      lineBreak: false,
    });

  doc
    .font(fonts.bold)
    .fontSize(11)
    .fillColor(BRAND.text)
    .text(doctorName, nameX, boxY + 28, {
      width: contentW * 0.38,
      lineBreak: false,
    });

  if (doctorCredentials) {
    doc
      .font(fonts.mono)
      .fontSize(7)
      .fillColor(BRAND.muted)
      .text(doctorCredentials, nameX, boxY + 44, {
        width: contentW * 0.38,
        lineBreak: false,
      });
  }

  doc
    .font(fonts.mono)
    .fontSize(7.5)
    .fillColor(BRAND.primary)
    .text(`Date: ${fmtDate(new Date())}`, nameX, boxY + boxH - 24, {
      lineBreak: false,
    });

  doc.y = boxY + boxH + 8;
}

export async function buildHealthProfilePdf(
  patientId: string,
  options: HealthProfilePdfOptions = {},
): Promise<{ buffer: Buffer; fullName: string }> {
  await connectToDatabase();

  const [
    patientUser,
    patientProfile,
    patientBase,
    medicalCtx,
    prescriptions,
    latestVitals,
    consultations,
    annotations,
    labs,
    immunizations,
    doctorUser,
  ] = await Promise.all([
    User.findById(patientId).lean(),
    PatientProfile.findOne({ userId: patientId }).lean(),
    Patient.findOne({ userId: patientId }).lean(),
    MedicalContext.findOne({ patientId }).lean(),
    Prescription.find({ patientId }).sort({ prescribedDate: -1 }).limit(40).lean(),
    Anthropometric.findOne({ patientId }).sort({ dateRecorded: -1 }).lean(),
    Consultation.find({ patientId })
      .sort({ scheduledStartTime: -1 })
      .limit(25)
      .populate("practitionerId", "firstName lastName")
      .lean(),
    BodyAnnotation.find({ patientId }).sort({ createdAt: 1 }).lean(),
    LabResult.find({ patientId }).sort({ dateReported: -1 }).limit(20).lean(),
    Immunization.find({ patientId }).sort({ dateAdministered: -1 }).limit(20).lean(),
    options.doctorId
      ? User.findById(options.doctorId).select("firstName lastName").lean()
      : Promise.resolve(null),
  ]);

  if (!patientUser) {
    throw Object.assign(new Error("Patient not found"), { status: 404 });
  }

  const fullName =
    `${(patientUser as any).firstName || ""} ${(patientUser as any).lastName || ""}`.trim() ||
    "Patient";

  // Resolve doctor display name
  let doctorName =
    options.doctorName?.trim() ||
    (doctorUser
      ? `Dr. ${(doctorUser as any).firstName || ""} ${(doctorUser as any).lastName || ""}`.trim()
      : "");

  if (!doctorName || doctorName === "Dr.") {
    // Fall back to most recent consultation practitioner
    const last = consultations.find(
      (c: any) => c.practitionerId && (c.practitionerId as any).firstName,
    ) as any;
    if (last?.practitionerId) {
      doctorName = `Dr. ${last.practitionerId.firstName || ""} ${last.practitionerId.lastName || ""}`.trim();
    }
  }
  if (!doctorName || doctorName === "Dr.") {
    doctorName = "Attending clinician";
  }

  const annos = (annotations || []).map((a: any, i: number) => ({
    n: i + 1,
    part: a.part || "Surface Mapping",
    description: a.description || "",
  }));

  const doc = createPdfDocument({
    info: {
      Title: `Health Profile — ${fullName}`,
      Author: doctorName,
      Subject: "Patient health profile — 24/7 DigiHealth",
    },
  });

  const fonts = registerBrandFonts(doc);
  const done = pdfToBuffer(doc);
  const left = PAGE_MARGIN;
  const contentW = doc.page.width - PAGE_MARGIN * 2;

  const ensureSpace = (need = 56) => {
    // Leave room for footer — do not open a page that stays blank
    if (!hasRoom(doc, need)) {
      doc.addPage();
      doc.y = PAGE_MARGIN;
    }
  };

  const section = (num: string, title: string) => {
    ensureSpace(40);
    doc.moveDown(0.45);
    const y = doc.y;
    doc.save();
    doc.roundedRect(left, y, 22, 16, 3).fill(BRAND.primary);
    doc.restore();
    doc
      .font(fonts.monoBold)
      .fontSize(8)
      .fillColor(BRAND.white)
      .text(num, left, y + 3.5, { width: 22, align: "center", lineBreak: false });
    doc
      .font(fonts.semi)
      .fontSize(11)
      .fillColor(BRAND.primary)
      .text(title, left + 28, y + 2, { lineBreak: false });
    doc
      .moveTo(left, y + 22)
      .lineTo(left + contentW, y + 22)
      .strokeColor(BRAND.line)
      .lineWidth(0.5)
      .stroke();
    doc.y = y + 28;
    doc.fillColor(BRAND.text).font(fonts.body).fontSize(10);
  };

  // ── Header ──
  drawHeader(doc, fonts, left, contentW);

  doc
    .font(fonts.bold)
    .fontSize(16)
    .fillColor(BRAND.text)
    .text("Patient Health Profile", left, doc.y);
  doc.moveDown(0.25);
  doc
    .font(fonts.mono)
    .fontSize(8)
    .fillColor(BRAND.muted)
    .text(
      `GENERATED  ${fmtDateTime(new Date())}    ·    REF  #${patientId.slice(-8).toUpperCase()}`,
      left,
      doc.y,
      { characterSpacing: 0.3 },
    );
  doc.moveDown(0.6);

  // Patient name callout
  doc.save();
  doc.roundedRect(left, doc.y, contentW, 44, 8).fill(BRAND.primary);
  doc.restore();
  const calloutY = doc.y;
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.white)
    .text("PATIENT", left + 14, calloutY + 10, { characterSpacing: 1 });
  doc
    .font(fonts.bold)
    .fontSize(14)
    .fillColor(BRAND.white)
    .text(fullName, left + 14, calloutY + 22);
  doc.y = calloutY + 54;

  // 1. Demographics
  section("01", "Demographics");
  const dob =
    (patientProfile as any)?.dateOfBirth || (patientUser as any).dateOfBirth;
  const demoPairs: [string, string][] = [
    ["Date of birth", fmtDate(dob)],
    [
      "Gender",
      (patientProfile as any)?.gender || (patientUser as any).gender || "N/A",
    ],
    ["Email", (patientUser as any).email || "N/A"],
    [
      "Mobile",
      (patientUser as any).mobile ||
        (patientProfile as any)?.mobileNumber ||
        "N/A",
    ],
    // Same source order as the practitioner patient view: MedicalContext is
    // where registration writes it, with the legacy Patient row and the
    // Anthropometric reading as fallbacks for older records.
    [
      "Blood type",
      (medicalCtx as any)?.bloodType ||
        (patientBase as any)?.bloodType ||
        (latestVitals as any)?.bloodType ||
        "Unknown",
    ],
    [
      "Activity level",
      (medicalCtx as any)?.activityLevel || "Not recorded",
    ],
    [
      "Emergency",
      (patientProfile as any)?.emergencyContact
        ? `${(patientProfile as any).emergencyContact.name || "N/A"} (${(patientProfile as any).emergencyContact.phone || "N/A"})`
        : "N/A",
    ],
  ];
  // Two-column layout
  const colW = contentW / 2 - 8;
  let colY = doc.y;
  demoPairs.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = left + col * (colW + 16);
    const y = colY + row * 32;
    doc
      .font(fonts.mono)
      .fontSize(7)
      .fillColor(BRAND.muted)
      .text(label.toUpperCase(), x, y, { width: colW, characterSpacing: 0.5 });
    doc
      .font(fonts.body)
      .fontSize(10)
      .fillColor(BRAND.text)
      .text(value, x, y + 12, { width: colW });
  });
  doc.y = colY + Math.ceil(demoPairs.length / 2) * 32 + 4;

  // 2. Vitals
  section("02", "Latest vitals");
  if (latestVitals) {
    const v = latestVitals as any;
    doc
      .font(fonts.mono)
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text(`RECORDED  ${fmtDate(v.dateRecorded)}`);
    doc.moveDown(0.3);
    doc
      .font(fonts.body)
      .fontSize(10)
      .fillColor(BRAND.text)
      .text(
        `Height  ${v.heightCm ?? "—"} cm      Weight  ${v.weightKg ?? "—"} kg      BMI  ${v.bmi != null ? Number(v.bmi).toFixed(1) : "—"}`,
      )
      .text(
        `BP  ${v.vitalSigns?.systolicBP ?? "—"}/${v.vitalSigns?.diastolicBP ?? "—"} mmHg      HR  ${v.vitalSigns?.heartRateBpm ?? "—"} bpm      SpO₂  ${v.vitalSigns?.spO2 ?? "—"}%`,
      );
  } else {
    doc.font(fonts.body).fillColor(BRAND.muted).text("No vitals on record.");
  }

  // 3. Clinical background
  section("03", "Clinical background");
  const conditions =
    (medicalCtx as any)?.chronicConditions ||
    (patientProfile as any)?.medicalHistory ||
    [];
  doc.font(fonts.semi).fontSize(10).fillColor(BRAND.primary).text("Chronic conditions");
  doc.font(fonts.body).fontSize(10).fillColor(BRAND.text);
  if (conditions.length) conditions.forEach((c: string) => doc.text(`  ·  ${c}`));
  else doc.fillColor(BRAND.muted).text("  None recorded.");

  doc.moveDown(0.35);
  doc.font(fonts.semi).fontSize(10).fillColor(BRAND.primary).text("Allergies");
  doc.font(fonts.body).fontSize(10).fillColor(BRAND.text);
  const allergies = (medicalCtx as any)?.allergies || [];
  if (allergies.length) {
    allergies.forEach((a: any) => {
      const name = typeof a === "string" ? a : a.allergen;
      const extra =
        typeof a === "string"
          ? ""
          : [a.severity, a.reaction].filter(Boolean).join(" — ");
      doc.text(`  ·  ${name}${extra ? ` (${extra})` : ""}`);
    });
  } else {
    doc.fillColor(BRAND.muted).text("  No known allergies.");
  }

  doc.moveDown(0.35);
  doc.font(fonts.semi).fontSize(10).fillColor(BRAND.primary).text("Current medications");
  doc.font(fonts.body).fontSize(10).fillColor(BRAND.text);
  const meds = (medicalCtx as any)?.currentMedications || [];
  if (meds.length) meds.forEach((m: string) => doc.text(`  ·  ${m}`));
  else doc.fillColor(BRAND.muted).text("  None recorded.");

  // 4. Prescriptions
  section("04", "Prescriptions");
  if (prescriptions.length) {
    prescriptions.forEach((p: any) => {
      ensureSpace(40);
      doc
        .font(fonts.semi)
        .fontSize(10)
        .fillColor(BRAND.text)
        .text(
          `${p.medicationName}${p.dosage ? `  —  ${p.dosage}` : ""}`,
        );
      doc
        .font(fonts.mono)
        .fontSize(8)
        .fillColor(BRAND.muted)
        .text(
          `${(p.status || "active").toUpperCase()}  ·  ${fmtDate(p.prescribedDate)}  ·  Refills ${p.refillsRemaining ?? 0}${p.documentUrl ? "  ·  Script on file" : ""}`,
        );
      if (p.instructions) {
        doc
          .font(fonts.body)
          .fontSize(9)
          .fillColor(BRAND.muted)
          .text(p.instructions);
      }
      doc.moveDown(0.3);
    });
  } else {
    doc.font(fonts.body).fillColor(BRAND.muted).text("No prescriptions on record.");
  }

  // 5. Consultations
  section("05", "Consultations");
  if (consultations.length) {
    consultations.forEach((c: any) => {
      ensureSpace(44);
      doc
        .font(fonts.semi)
        .fontSize(10)
        .fillColor(BRAND.text)
        .text(
          `${fmtDateTime(c.scheduledStartTime)}  ·  ${(c.type || "consult").toUpperCase()}`,
        );
      doc
        .font(fonts.mono)
        .fontSize(8)
        .fillColor(BRAND.primary)
        .text(String(c.status || "").toUpperCase());
      doc
        .font(fonts.body)
        .fontSize(9)
        .fillColor(BRAND.muted)
        .text(`Chief complaint: ${c.chiefComplaint || "—"}`);
      if (c.soapNotes?.assessment) {
        doc.text(`Assessment: ${c.soapNotes.assessment}`);
      }
      if (c.soapNotes?.plan) {
        doc.text(`Plan: ${c.soapNotes.plan}`);
      }
      doc.moveDown(0.25);
    });
  } else {
    doc.font(fonts.body).fillColor(BRAND.muted).text("No consultations on record.");
  }

  // 6. Labs
  section("06", "Laboratory results");
  if (labs.length) {
    labs.forEach((l: any) => {
      ensureSpace(32);
      doc
        .font(fonts.semi)
        .fontSize(10)
        .fillColor(BRAND.text)
        .text(`${l.testName}`);
      doc
        .font(fonts.mono)
        .fontSize(8)
        .fillColor(BRAND.muted)
        .text(fmtDate(l.dateReported));
      (l.parameters || []).slice(0, 6).forEach((p: any) => {
        doc
          .font(fonts.body)
          .fontSize(9)
          .fillColor(BRAND.text)
          .text(
            `  ${p.name}: ${p.value} ${p.unit || ""}  (${p.referenceRange || "—"})`,
          );
      });
      doc.moveDown(0.2);
    });
  } else {
    doc.font(fonts.body).fillColor(BRAND.muted).text("No lab results on record.");
  }

  // 7. Immunizations
  section("07", "Immunizations");
  if (immunizations.length) {
    immunizations.forEach((i: any) => {
      doc
        .font(fonts.body)
        .fontSize(10)
        .fillColor(BRAND.text)
        .text(
          `  ·  ${i.vaccineName}  —  ${fmtDate(i.dateAdministered)}${i.dosage ? `  ·  ${i.dosage}` : ""}`,
        );
    });
  } else {
    doc.font(fonts.body).fillColor(BRAND.muted).text("No immunizations on record.");
  }

  // 8. Body map citations
  section("08", "Body-map annotations");
  if (!annos.length) {
    doc.font(fonts.body).fillColor(BRAND.muted).text("No body-map annotations recorded.");
  } else {
    annos.forEach((a) => {
      ensureSpace(36);
      doc
        .font(fonts.monoBold)
        .fontSize(9)
        .fillColor(BRAND.primary)
        .text(`[${a.n}]`, { continued: true });
      doc
        .font(fonts.semi)
        .fontSize(10)
        .fillColor(BRAND.text)
        .text(`  ${a.part}`);
      doc
        .font(fonts.body)
        .fontSize(9)
        .fillColor(BRAND.muted)
        .text(a.description || "—");
      doc.moveDown(0.2);
    });
  }

  // Signature (stays on last content page when possible)
  drawSignatureBlock(
    doc,
    fonts,
    left,
    contentW,
    doctorName,
    options.doctorCredentials,
  );

  if (hasRoom(doc, 20)) {
    doc
      .font(fonts.mono)
      .fontSize(6.5)
      .fillColor(BRAND.muted)
      .text(
        "Generated from the 24/7 DigiHealth EHR. Not a substitute for original signed prescriptions.",
        left,
        doc.y,
        { width: contentW, lineBreak: false },
      );
  }

  doc.end();
  const buffer = await done;
  return { buffer, fullName };
}
