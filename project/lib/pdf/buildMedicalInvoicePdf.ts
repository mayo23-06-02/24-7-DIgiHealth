/**
 * Medical-aid invoice PDF in the South African format: practice header, doctor HPCSA and
 * practice number, patient and medical aid details, then tariff + ICD-10 line items.
 */
import {
  BRAND,
  createPdfDocument,
  drawBrandLogo,
  PAGE_MARGIN,
  pdfToBuffer,
  registerBrandFonts,
  type PdfDoc,
} from "./createPdfDocument";

export interface MedicalInvoicePdfInput {
  invoiceNumber: string;
  status: string;
  serviceDate?: string | Date | null;
  issuedAt?: string | Date | null;
  patientName: string;
  patientIdNumber?: string | null;
  medicalAidProvider?: string | null;
  medicalAidPlan?: string | null;
  medicalAidMemberNumber?: string | null;
  dependantCode?: string | null;
  practitionerName: string;
  hpcsaNumber?: string | null;
  practiceNumber?: string | null;
  facilityName: string;
  facilityAddress?: string | null;
  notes?: string | null;
  total: number;
  currency?: string;
  items: {
    tariffCode?: string | null;
    icd10Code?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
}

const STATUS_LABEL: Record<string, string> = {
  issued: "Issued",
  submitted: "Submitted to medical aid",
  paid: "Paid",
  partially_paid: "Partially paid",
  rejected: "Rejected by medical aid",
  cancelled: "Cancelled",
};

function money(n: number, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency, minimumFractionDigits: 2 }).format(n || 0);
}

function day(d?: string | Date | null) {
  if (!d) return "—";
  const v = new Date(d);
  return Number.isNaN(v.getTime())
    ? "—"
    : v.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function ensureRoom(doc: PdfDoc, need: number) {
  if (doc.y + need > doc.page.height - PAGE_MARGIN - 16) {
    doc.addPage();
    doc.y = PAGE_MARGIN;
  }
}

export async function buildMedicalInvoicePdf(inv: MedicalInvoicePdfInput): Promise<{ buffer: Buffer; filename: string }> {
  const currency = inv.currency || "ZAR";
  const doc = createPdfDocument();
  const fonts = registerBrandFonts(doc);
  const left = PAGE_MARGIN;
  const contentW = doc.page.width - PAGE_MARGIN * 2;
  const endPromise = pdfToBuffer(doc);

  doc.save();
  doc.rect(0, 0, doc.page.width, 6).fill(BRAND.primary);
  doc.restore();
  const { width: logoW } = drawBrandLogo(doc, left, 18, { height: 28, width: 180 });
  const titleX = left + Math.max(logoW + 16, 160);
  doc.font(fonts.bold).fontSize(16).fillColor(BRAND.text).text("MEDICAL ACCOUNT", titleX, 20, {
    width: contentW - (titleX - left),
    align: "right",
    lineBreak: false,
  });
  doc.font(fonts.mono).fontSize(8).fillColor(BRAND.muted).text(`Invoice ${inv.invoiceNumber}`, titleX, 42, {
    width: contentW - (titleX - left),
    align: "right",
    lineBreak: false,
  });

  doc.y = 72;
  doc.moveTo(left, doc.y).lineTo(left + contentW, doc.y).strokeColor(BRAND.line).lineWidth(0.6).stroke();
  doc.y += 16;

  // Practice (from) and patient (to)
  const colW = contentW / 2 - 8;
  const y0 = doc.y;
  const block = (x: number, label: string, name: string, lines: (string | null | undefined)[]) => {
    doc.font(fonts.mono).fontSize(7).fillColor(BRAND.muted).text(label, x, y0, { lineBreak: false });
    doc.font(fonts.bold).fontSize(11).fillColor(BRAND.text).text(name, x, y0 + 12, { width: colW });
    for (const l of lines) {
      if (!l) continue;
      doc.font(fonts.body).fontSize(9).fillColor(BRAND.muted).text(l, x, doc.y + 1, { width: colW });
    }
    return doc.y;
  };
  const fromBottom = block(left, "PRACTICE", inv.practitionerName, [
    inv.facilityName,
    inv.facilityAddress,
    `HPCSA no: ${inv.hpcsaNumber || "—"}`,
    `Practice no: ${inv.practiceNumber || "—"}`,
  ]);
  const toBottom = block(left + colW + 16, "PATIENT", inv.patientName, [
    inv.patientIdNumber ? `ID no: ${inv.patientIdNumber}` : null,
    `Medical aid: ${inv.medicalAidProvider || "—"}`,
    `Plan: ${inv.medicalAidPlan || "—"}`,
    `Member no: ${inv.medicalAidMemberNumber || "—"}`,
    inv.dependantCode ? `Dependant code: ${inv.dependantCode}` : null,
  ]);
  doc.y = Math.max(fromBottom, toBottom) + 16;

  // Meta strip
  const metaY = doc.y;
  doc.save();
  doc.roundedRect(left, metaY, contentW, 46, 6).fill(BRAND.soft);
  doc.restore();
  const meta = [
    { l: "Service date", v: day(inv.serviceDate) },
    { l: "Issued", v: day(inv.issuedAt) },
    { l: "Status", v: STATUS_LABEL[inv.status] || inv.status },
    { l: "Total", v: money(inv.total, currency) },
  ];
  meta.forEach((m, i) => {
    const x = left + 12 + i * (contentW / 4);
    doc.font(fonts.mono).fontSize(7).fillColor(BRAND.muted).text(m.l.toUpperCase(), x, metaY + 10, { lineBreak: false });
    doc.font(fonts.semi).fontSize(9).fillColor(BRAND.text).text(m.v, x, metaY + 24, {
      width: contentW / 4 - 16,
      lineBreak: false,
      ellipsis: true,
    });
  });
  doc.y = metaY + 60;

  // Line items: tariff | ICD-10 | description | qty | unit | amount
  const cols = [
    { k: "Tariff", w: 54, align: "left" as const },
    { k: "ICD-10", w: 58, align: "left" as const },
    { k: "Description", w: contentW - 54 - 58 - 34 - 72 - 78 - 20, align: "left" as const },
    { k: "Qty", w: 34, align: "right" as const },
    { k: "Unit", w: 72, align: "right" as const },
    { k: "Amount", w: 78, align: "right" as const },
  ];
  const header = () => {
    const hy = doc.y;
    doc.save();
    doc.rect(left, hy, contentW, 20).fill(BRAND.primary);
    doc.restore();
    let x = left + 10;
    for (const c of cols) {
      doc.font(fonts.monoBold).fontSize(7.5).fillColor(BRAND.white).text(c.k, x, hy + 6, {
        width: c.w,
        align: c.align,
        lineBreak: false,
      });
      x += c.w;
    }
    doc.y = hy + 26;
  };
  header();
  for (const it of inv.items) {
    ensureRoom(doc, 30);
    if (doc.y === PAGE_MARGIN) header();
    const rowY = doc.y;
    const cells = [
      it.tariffCode || "—",
      (it.icd10Code || "—").replace(/,\s*/g, ", "),
      it.description,
      String(it.quantity),
      money(it.unitPrice, currency),
      money(it.amount, currency),
    ];
    let x = left + 10;
    let bottom = rowY;
    cells.forEach((v, i) => {
      const c = cols[i];
      const font = i < 2 ? fonts.mono : i === 5 ? fonts.semi : fonts.body;
      doc.font(font).fontSize(9).fillColor(BRAND.text).text(v, x, rowY, { width: c.w - 4, align: c.align });
      bottom = Math.max(bottom, doc.y);
      x += c.w;
    });
    doc.y = bottom + 6;
    doc.moveTo(left, doc.y).lineTo(left + contentW, doc.y).strokeColor(BRAND.line).lineWidth(0.4).stroke();
    doc.y += 6;
  }

  ensureRoom(doc, 60);
  doc.y += 6;
  doc.font(fonts.mono).fontSize(8).fillColor(BRAND.muted).text(`TOTAL (${currency})`, left + contentW - 188, doc.y, {
    lineBreak: false,
  });
  doc.font(fonts.bold).fontSize(14).fillColor(BRAND.primaryDark).text(money(inv.total, currency), left + contentW - 188, doc.y + 12, {
    width: 188,
    align: "right",
    lineBreak: false,
  });
  doc.y += 44;

  if (inv.notes) {
    ensureRoom(doc, 40);
    doc.font(fonts.mono).fontSize(7).fillColor(BRAND.muted).text("NOTES", left, doc.y, { lineBreak: false });
    doc.font(fonts.body).fontSize(9).fillColor(BRAND.text).text(inv.notes, left, doc.y + 11, { width: contentW });
    doc.y += 10;
  }

  ensureRoom(doc, 40);
  doc.font(fonts.body).fontSize(8).fillColor(BRAND.muted).text(
    "Submit this account to your medical aid, or settle it with the practice directly. Payment is not taken through 24/7 Digi-Health. Contact the practice about any query on this account.",
    left,
    doc.y + 6,
    { width: contentW },
  );
  doc.font(fonts.mono).fontSize(7).fillColor(BRAND.muted).text(
    `Generated ${new Date().toLocaleString("en-ZA")} · 24/7 Digi-Health`,
    left,
    doc.y + 10,
    { lineBreak: false },
  );

  doc.end();
  const buffer = await endPromise;
  return { buffer, filename: `${inv.invoiceNumber}.pdf` };
}
