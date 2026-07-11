/**
 * Branded PDF export of a practitioner's patient list.
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
import { riskBandStyle } from "@/lib/riskScore";

export interface PatientListPdfRow {
  fullName: string;
  age?: number | null;
  gender?: string | null;
  dateJoined?: string | Date | null;
  lastVisit?: string | Date | null;
  nextAppointment?: string | Date | null;
  riskScore?: number | null;
  riskLabel?: string | null;
}

export interface PatientsListPdfOptions {
  patients: PatientListPdfRow[];
  practitionerName?: string;
  filters?: {
    search?: string;
    risk?: string;
    dateFrom?: string;
    dateTo?: string;
    sortLabel?: string;
  };
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function fmtShort(d?: string | Date | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}

function drawHeader(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  contentW: number,
  meta: { practitionerName?: string; total: number },
) {
  const pageW = doc.page.width;
  doc.save();
  doc.rect(0, 0, pageW, 6).fill(BRAND.primary);
  doc.restore();

  const { width: logoW, height } = drawBrandLogo(doc, left, 16, {
    height: 30,
    width: Math.min(contentW * 0.5, 200),
  });

  const metaX = left + Math.max(logoW + 12, 150);
  const metaW = Math.max(80, left + contentW - metaX);
  if (metaW > 60) {
    doc
      .font(fonts.mono)
      .fontSize(7)
      .fillColor(BRAND.muted)
      .text("PATIENT ROSTER", metaX, 20, {
        width: metaW,
        align: "right",
        lineBreak: false,
        characterSpacing: 0.8,
      });
    doc
      .font(fonts.mono)
      .fontSize(7)
      .fillColor(BRAND.primary)
      .text(`${meta.total} PATIENTS`, metaX, 32, {
        width: metaW,
        align: "right",
        lineBreak: false,
      });
  }

  const yLine = 16 + Math.max(height, 30) + 10;
  doc
    .moveTo(left, yLine)
    .lineTo(left + contentW, yLine)
    .strokeColor(BRAND.primary)
    .lineWidth(1.25)
    .stroke();
  doc
    .moveTo(left, yLine + 2.5)
    .lineTo(left + 56, yLine + 2.5)
    .strokeColor(BRAND.secondary)
    .lineWidth(2)
    .stroke();

  doc.y = yLine + 14;

  doc
    .font(fonts.bold)
    .fontSize(16)
    .fillColor(BRAND.text)
    .text("Patient List Export", left, doc.y, { lineBreak: false });
  doc.y += 20;

  doc
    .font(fonts.mono)
    .fontSize(8)
    .fillColor(BRAND.muted)
    .text(
      `Generated ${new Date().toLocaleString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}${meta.practitionerName ? `  ·  ${meta.practitionerName}` : ""}`,
      left,
      doc.y,
      { lineBreak: false },
    );
  doc.y += 16;
}

function drawFilters(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  contentW: number,
  filters?: PatientsListPdfOptions["filters"],
) {
  if (!filters) return;
  const chips: string[] = [];
  if (filters.search) chips.push(`Search: ${filters.search}`);
  if (filters.risk) chips.push(`Risk: ${filters.risk}`);
  if (filters.dateFrom) chips.push(`From: ${filters.dateFrom}`);
  if (filters.dateTo) chips.push(`To: ${filters.dateTo}`);
  if (filters.sortLabel) chips.push(`Sort: ${filters.sortLabel}`);
  if (!chips.length) return;

  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text(chips.join("   ·   "), left, doc.y, {
      width: contentW,
      lineBreak: false,
    });
  doc.y += 14;
}

/** Column layout fractions of content width */
const COL_DEFS = [
  { key: "name", label: "PATIENT", frac: 0.26 },
  { key: "age", label: "AGE", frac: 0.07 },
  { key: "gender", label: "GENDER", frac: 0.1 },
  { key: "joined", label: "JOINED", frac: 0.15 },
  { key: "last", label: "LAST VISIT", frac: 0.15 },
  { key: "next", label: "NEXT", frac: 0.13 },
  { key: "risk", label: "RISK", frac: 0.14 },
] as const;

function buildCols(contentW: number) {
  let x = 0;
  return COL_DEFS.map((def) => {
    const w = Math.floor(contentW * def.frac);
    const col = { key: def.key, label: def.label, x, w };
    x += w;
    return col;
  });
}

function drawTableHeader(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  y: number,
  contentW: number,
  cols: ReturnType<typeof buildCols>,
) {
  const rowH = 22;
  doc.save();
  doc.roundedRect(left, y, contentW, rowH, 4).fill(BRAND.primary);
  doc.restore();
  cols.forEach((col) => {
    doc
      .font(fonts.monoBold)
      .fontSize(7)
      .fillColor(BRAND.white)
      .text(col.label, left + col.x + 6, y + 7, {
        width: col.w - 8,
        lineBreak: false,
      });
  });
  return y + rowH + 2;
}

function drawRow(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  y: number,
  p: PatientListPdfRow,
  alt: boolean,
  contentW: number,
  cols: ReturnType<typeof buildCols>,
) {
  const rowH = 26;
  if (alt) {
    doc.save();
    doc.rect(left, y, contentW, rowH).fill(BRAND.soft);
    doc.restore();
  }

  const risk = p.riskScore ?? 0;
  const riskStyle = riskBandStyle(risk);
  const cells = [
    { text: p.fullName || "—", ...cols[0] },
    { text: p.age != null ? String(p.age) : "—", ...cols[1] },
    {
      text: p.gender
        ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1)
        : "—",
      ...cols[2],
    },
    { text: fmtDate(p.dateJoined), ...cols[3] },
    { text: fmtDate(p.lastVisit), ...cols[4] },
    { text: fmtShort(p.nextAppointment), ...cols[5] },
  ];

  cells.forEach((cell, i) => {
    const isName = i === 0;
    doc
      .font(isName ? fonts.semi : fonts.body)
      .fontSize(isName ? 8.5 : 8)
      .fillColor(BRAND.text)
      .text(cell.text, left + cell.x + 6, y + 8, {
        width: cell.w - 8,
        lineBreak: false,
        ellipsis: true,
      });
  });

  // Risk score pill
  const riskCol = cols[6];
  const pillW = Math.min(36, riskCol.w - 10);
  const pillH = 14;
  const pillX = left + riskCol.x + 6;
  const pillY = y + (rowH - pillH) / 2;
  doc.save();
  doc.roundedRect(pillX, pillY, pillW, pillH, 7).fill(riskStyle.bg);
  doc.restore();
  doc
    .font(fonts.monoBold)
    .fontSize(8)
    .fillColor(BRAND.white)
    .text(String(risk), pillX, pillY + 3, {
      width: pillW,
      align: "center",
      lineBreak: false,
    });

  doc
    .moveTo(left, y + rowH)
    .lineTo(left + contentW, y + rowH)
    .strokeColor(BRAND.line)
    .lineWidth(0.4)
    .stroke();

  return y + rowH;
}

export async function buildPatientsListPdf(
  options: PatientsListPdfOptions,
): Promise<{ buffer: Buffer; count: number }> {
  const { patients, practitionerName, filters } = options;
  const doc = createPdfDocument({
    info: {
      Title: "Patient List — 24/7 DigiHealth",
      Author: practitionerName || "24/7 DigiHealth",
      Subject: "Practitioner patient roster export",
    },
  });

  const fonts = registerBrandFonts(doc);
  const done = pdfToBuffer(doc);
  const left = PAGE_MARGIN;
  const contentW = doc.page.width - PAGE_MARGIN * 2;
  const pageBottom = doc.page.height - PAGE_MARGIN - 16;

  drawHeader(doc, fonts, left, contentW, {
    practitionerName,
    total: patients.length,
  });
  drawFilters(doc, fonts, left, contentW, filters);

  // Summary strip
  const avgRisk =
    patients.length === 0
      ? 0
      : Math.round(
          patients.reduce((s, p) => s + (p.riskScore ?? 0), 0) /
            patients.length,
        );
  const highRisk = patients.filter((p) => (p.riskScore ?? 0) >= 76).length;

  const stripY = doc.y;
  doc.save();
  doc.roundedRect(left, stripY, contentW, 36, 6).fill(BRAND.soft);
  doc.restore();
  const stats = [
    { label: "TOTAL", value: String(patients.length) },
    { label: "AVG RISK", value: String(avgRisk) },
    { label: "HIGH RISK", value: String(highRisk) },
  ];
  stats.forEach((s, i) => {
    const x = left + 16 + i * (contentW / 3);
    doc
      .font(fonts.mono)
      .fontSize(6.5)
      .fillColor(BRAND.muted)
      .text(s.label, x, stripY + 8, { lineBreak: false });
    doc
      .font(fonts.bold)
      .fontSize(12)
      .fillColor(BRAND.primary)
      .text(s.value, x, stripY + 18, { lineBreak: false });
  });
  doc.y = stripY + 48;

  const cols = buildCols(contentW);
  let y = drawTableHeader(doc, fonts, left, doc.y, contentW, cols);

  if (patients.length === 0) {
    doc
      .font(fonts.body)
      .fontSize(10)
      .fillColor(BRAND.muted)
      .text("No patients match the current filters.", left, y + 20);
  } else {
    patients.forEach((p, idx) => {
      if (y + 28 > pageBottom) {
        doc.addPage();
        doc
          .font(fonts.mono)
          .fontSize(7)
          .fillColor(BRAND.muted)
          .text("Patient list (continued)", left, PAGE_MARGIN, {
            lineBreak: false,
          });
        y = drawTableHeader(doc, fonts, left, PAGE_MARGIN + 16, contentW, cols);
      }
      y = drawRow(doc, fonts, left, y, p, idx % 2 === 1, contentW, cols);
    });
  }

  doc.end();
  const buffer = await done;
  return { buffer, count: patients.length };
}
