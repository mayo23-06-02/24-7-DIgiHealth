/**
 * Branded Clinical Insights PDF with data visualisations (bars, risk pie, KPI strip).
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
import type { PractitionerInsightsData } from "@/lib/insights/buildPractitionerInsights";

function ensureRoom(
  doc: PdfDoc,
  need: number,
  left: number,
  contentW: number,
  fonts: ReturnType<typeof registerBrandFonts>,
  contLabel: string,
) {
  const bottom = doc.page.height - PAGE_MARGIN - 12;
  if (doc.y + need <= bottom) return;
  doc.addPage();
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text(contLabel, left, PAGE_MARGIN, { lineBreak: false });
  doc.y = PAGE_MARGIN + 16;
  doc
    .moveTo(left, doc.y)
    .lineTo(left + contentW, doc.y)
    .strokeColor(BRAND.line)
    .lineWidth(0.5)
    .stroke();
  doc.y += 10;
}

function sectionTitle(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  title: string,
) {
  doc
    .font(fonts.bold)
    .fontSize(12)
    .fillColor(BRAND.text)
    .text(title, left, doc.y, { lineBreak: false });
  doc.y += 16;
}

function drawHBarChart(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  contentW: number,
  rows: { label: string; value: number; color?: string }[],
  opts?: { maxBars?: number; barMax?: number },
) {
  const maxBars = opts?.maxBars ?? 8;
  const data = rows.slice(0, maxBars);
  if (!data.length) {
    doc
      .font(fonts.body)
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text("No data for this period.", left, doc.y);
    doc.y += 16;
    return;
  }
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const labelW = 110;
  const barW = contentW - labelW - 36;
  const rowH = 18;

  data.forEach((row) => {
    const y = doc.y;
    doc
      .font(fonts.body)
      .fontSize(8)
      .fillColor(BRAND.text)
      .text(row.label.slice(0, 28), left, y + 2, {
        width: labelW - 4,
        lineBreak: false,
        ellipsis: true,
      });
    const w = Math.max(4, (row.value / maxVal) * barW);
    doc.save();
    doc
      .roundedRect(left + labelW, y, w, 12, 3)
      .fill(row.color || BRAND.primary);
    doc.restore();
    doc
      .font(fonts.mono)
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text(String(row.value), left + labelW + w + 6, y + 2, {
        lineBreak: false,
      });
    doc.y = y + rowH;
  });
  doc.y += 6;
}

function drawRiskPie(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  cx: number,
  cy: number,
  radius: number,
  slices: { value: number; color: string; label: string }[],
) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let angle = -Math.PI / 2;
  slices.forEach((slice) => {
    if (slice.value <= 0) return;
    const sweep = (slice.value / total) * Math.PI * 2;
    const steps = Math.max(8, Math.ceil((sweep / (Math.PI * 2)) * 48));
    doc.save();
    doc.moveTo(cx, cy);
    for (let i = 0; i <= steps; i++) {
      const a = angle + (sweep * i) / steps;
      const x = cx + radius * Math.cos(a);
      const y = cy + radius * Math.sin(a);
      if (i === 0) doc.lineTo(x, y);
      else doc.lineTo(x, y);
    }
    doc.closePath().fill(slice.color);
    doc.restore();
    angle += sweep;
  });
  // donut hole
  doc.save();
  doc.circle(cx, cy, radius * 0.55).fill(BRAND.white);
  doc.restore();
  doc
    .font(fonts.bold)
    .fontSize(14)
    .fillColor(BRAND.primary)
    .text(String(total), cx - 20, cy - 10, {
      width: 40,
      align: "center",
      lineBreak: false,
    });
  doc
    .font(fonts.mono)
    .fontSize(6)
    .fillColor(BRAND.muted)
    .text("PATIENTS", cx - 24, cy + 6, {
      width: 48,
      align: "center",
      lineBreak: false,
    });

  // legend to the right
  let ly = cy - radius;
  slices.forEach((s) => {
    if (s.value <= 0) return;
    doc.save();
    doc.roundedRect(cx + radius + 16, ly + 2, 8, 8, 2).fill(s.color);
    doc.restore();
    doc
      .font(fonts.body)
      .fontSize(8)
      .fillColor(BRAND.text)
      .text(`${s.label}  (${s.value})`, cx + radius + 30, ly, {
        lineBreak: false,
      });
    ly += 14;
  });
}

function drawVBarChart(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  contentW: number,
  rows: { label: string; value: number }[],
  color = BRAND.primary,
) {
  if (!rows.length || rows.every((r) => r.value === 0)) {
    doc
      .font(fonts.body)
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text("No volume in this period.", left, doc.y);
    doc.y += 16;
    return;
  }
  const chartH = 70;
  const maxVal = Math.max(...rows.map((r) => r.value), 1);
  const gap = 2;
  const barW = Math.min(18, (contentW - gap * rows.length) / rows.length);
  const baseY = doc.y + chartH;

  rows.forEach((row, i) => {
    const h = (row.value / maxVal) * (chartH - 12);
    const x = left + i * (barW + gap);
    const y = baseY - h;
    doc.save();
    doc.roundedRect(x, y, barW, Math.max(h, 1), 2).fill(color);
    doc.restore();
  });

  // show first / mid / last labels
  doc.y = baseY + 4;
  const showIdx = [0, Math.floor(rows.length / 2), rows.length - 1];
  showIdx.forEach((i) => {
    if (i < 0 || i >= rows.length) return;
    const x = left + i * (barW + gap);
    doc
      .font(fonts.mono)
      .fontSize(6)
      .fillColor(BRAND.muted)
      .text(rows[i].label.slice(5) || rows[i].label, x - 4, doc.y, {
        width: barW + 12,
        align: "center",
        lineBreak: false,
      });
  });
  doc.y += 14;
}

export async function buildInsightsPdf(
  data: PractitionerInsightsData,
): Promise<{ buffer: Buffer }> {
  const doc = createPdfDocument({
    info: {
      Title: `Clinical Insights — ${data.practitioner.name}`,
      Author: data.practitioner.name,
      Subject: "DigiHealth teleclinic clinical insights report",
    },
  });
  const fonts = registerBrandFonts(doc);
  const done = pdfToBuffer(doc);
  const left = PAGE_MARGIN;
  const contentW = doc.page.width - PAGE_MARGIN * 2;
  const cont = "Clinical Insights (continued)";

  // Header
  doc.save();
  doc.rect(0, 0, doc.page.width, 6).fill(BRAND.primary);
  doc.restore();
  const { width: logoW, height: logoH } = drawBrandLogo(doc, left, 16, {
    height: 28,
    width: Math.min(contentW * 0.45, 180),
  });
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text("CLINICAL INSIGHTS", left + Math.max(logoW + 12, 140), 18, {
      width: contentW - 150,
      align: "right",
      lineBreak: false,
      characterSpacing: 0.6,
    });
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.primary)
    .text(
      `LAST ${data.periodDays} DAYS`,
      left + Math.max(logoW + 12, 140),
      30,
      { width: contentW - 150, align: "right", lineBreak: false },
    );

  doc.y = 16 + Math.max(logoH, 28) + 12;
  doc
    .moveTo(left, doc.y)
    .lineTo(left + contentW, doc.y)
    .strokeColor(BRAND.primary)
    .lineWidth(1.25)
    .stroke();
  doc.y += 12;

  doc
    .font(fonts.bold)
    .fontSize(16)
    .fillColor(BRAND.text)
    .text("Teleclinic Performance Report", left, doc.y, { lineBreak: false });
  doc.y += 20;
  doc
    .font(fonts.semi)
    .fontSize(11)
    .fillColor(BRAND.primary)
    .text(data.practitioner.name, left, doc.y, { lineBreak: false });
  doc.y += 14;
  doc
    .font(fonts.body)
    .fontSize(9)
    .fillColor(BRAND.muted)
    .text(
      [
        data.practitioner.specialisation,
        data.practitioner.hpcsaNumber !== "—"
          ? `HPCSA ${data.practitioner.hpcsaNumber}`
          : null,
        data.practitioner.city || data.practitioner.province
          ? [data.practitioner.city, data.practitioner.province]
              .filter(Boolean)
              .join(", ")
          : null,
        `Generated ${new Date(data.generatedAt).toLocaleString("en-ZA")}`,
      ]
        .filter(Boolean)
        .join("  ·  "),
      left,
      doc.y,
      { width: contentW },
    );
  doc.y += 18;

  // KPI strip
  ensureRoom(doc, 50, left, contentW, fonts, cont);
  const kpis = [
    { label: "PATIENTS", value: String(data.kpis.totalPatients) },
    { label: "CONSULTS", value: String(data.kpis.periodConsults) },
    { label: "ADHERENCE", value: `${data.kpis.adherencePercent}%` },
    { label: "AVG RISK", value: String(data.kpis.avgRiskScore) },
    { label: "HIGH RISK", value: String(data.kpis.highRiskPatients) },
    { label: "SOAP", value: `${data.kpis.soapCompletionPercent}%` },
  ];
  const cellW = contentW / kpis.length;
  const stripY = doc.y;
  doc.save();
  doc.roundedRect(left, stripY, contentW, 40, 6).fill(BRAND.soft);
  doc.restore();
  kpis.forEach((k, i) => {
    const x = left + i * cellW + 8;
    doc
      .font(fonts.mono)
      .fontSize(6)
      .fillColor(BRAND.muted)
      .text(k.label, x, stripY + 8, { lineBreak: false });
    doc
      .font(fonts.bold)
      .fontSize(12)
      .fillColor(BRAND.primary)
      .text(k.value, x, stripY + 20, { lineBreak: false });
  });
  doc.y = stripY + 52;

  // Practitioner / teleclinic snapshot
  ensureRoom(doc, 80, left, contentW, fonts, cont);
  sectionTitle(doc, fonts, left, "Practitioner & teleclinic");
  const snapshot = [
    `Languages: ${data.practitioner.languages.join(", ") || "—"}`,
    `Medical aids: ${data.practitioner.acceptedMedicalAids.slice(0, 4).join(", ") || "—"}`,
    `Experience: ${data.practitioner.experienceYears != null ? `${data.practitioner.experienceYears} years` : "—"}`,
    `Rating: ${data.kpis.rating > 0 ? `${data.kpis.rating}/5 (${data.kpis.reviewCount} reviews)` : "—"}`,
    `Channel mix: Video ${data.teleclinic.videoPercent}% · Chat ${data.teleclinic.chatPercent}% · In person ${data.teleclinic.inPersonPercent}%`,
    `Avg call length: ${data.teleclinic.avgMinutesPerConsult || "—"} min · Rx issued: ${data.kpis.prescriptionsIssued}`,
    data.kpis.earningsZar > 0
      ? `Period earnings: R ${data.kpis.earningsZar.toLocaleString("en-ZA")}`
      : null,
  ].filter(Boolean) as string[];
  snapshot.forEach((line) => {
    doc
      .font(fonts.body)
      .fontSize(9)
      .fillColor(BRAND.text)
      .text(`•  ${line}`, left, doc.y, { width: contentW });
    doc.y += 2;
  });
  doc.y += 10;

  // Risk pie
  ensureRoom(doc, 130, left, contentW, fonts, cont);
  sectionTitle(doc, fonts, left, "Risk score distribution");
  const pieY = doc.y + 50;
  drawRiskPie(
    doc,
    fonts,
    left + 70,
    pieY,
    48,
    data.riskDist.map((r) => ({
      value: r.value,
      color: r.color,
      label: r.label,
    })),
  );
  doc.y = pieY + 60;

  // Volume trend
  ensureRoom(doc, 110, left, contentW, fonts, cont);
  sectionTitle(doc, fonts, left, `Consultation volume (${data.periodDays}d)`);
  // sample trend to max ~40 bars for PDF
  const trend = data.consultTrend;
  const step = Math.max(1, Math.ceil(trend.length / 40));
  const sampled = trend.filter((_, i) => i % step === 0);
  drawVBarChart(
    doc,
    fonts,
    left,
    contentW,
    sampled.map((t) => ({ label: t.date, value: t.count })),
    BRAND.primary,
  );

  // Type mix + peak days side-ish
  ensureRoom(doc, 100, left, contentW, fonts, cont);
  sectionTitle(doc, fonts, left, "Consultation types");
  drawHBarChart(
    doc,
    fonts,
    left,
    contentW,
    data.typeMix.map((t) => ({
      label: t.name,
      value: t.value,
      color: t.color,
    })),
  );

  ensureRoom(doc, 100, left, contentW, fonts, cont);
  sectionTitle(doc, fonts, left, "Demand by weekday");
  drawHBarChart(
    doc,
    fonts,
    left,
    contentW,
    data.peakDays.map((d) => ({
      label: d.day,
      value: d.count,
      color: BRAND.secondary,
    })),
  );

  ensureRoom(doc, 100, left, contentW, fonts, cont);
  sectionTitle(doc, fonts, left, "Peak hours");
  drawHBarChart(
    doc,
    fonts,
    left,
    contentW,
    data.peakHours
      .filter((h) => h.count > 0)
      .slice(0, 12)
      .map((h) => ({
        label: h.hour,
        value: h.count,
        color: "#6554C0",
      })),
  );

  // Demographics
  ensureRoom(doc, 90, left, contentW, fonts, cont);
  sectionTitle(doc, fonts, left, "Patient demographics — gender");
  drawHBarChart(
    doc,
    fonts,
    left,
    contentW,
    data.genderDist.map((g) => ({
      label: g.name,
      value: g.value,
      color: g.color,
    })),
  );

  ensureRoom(doc, 100, left, contentW, fonts, cont);
  sectionTitle(doc, fonts, left, "Patient demographics — age");
  drawHBarChart(
    doc,
    fonts,
    left,
    contentW,
    data.ageBands.map((a) => ({
      label: a.name,
      value: a.value,
      color: BRAND.primaryDark,
    })),
  );

  // Conditions & reasons
  ensureRoom(doc, 120, left, contentW, fonts, cont);
  sectionTitle(doc, fonts, left, "Chronic conditions");
  drawHBarChart(
    doc,
    fonts,
    left,
    contentW,
    data.conditions.map((c) => ({
      label: c.name,
      value: c.value,
      color: "#36B37E",
    })),
  );

  ensureRoom(doc, 120, left, contentW, fonts, cont);
  sectionTitle(doc, fonts, left, "Top consultation reasons");
  drawHBarChart(
    doc,
    fonts,
    left,
    contentW,
    data.topReasons.map((r) => ({
      label: r.name,
      value: r.count,
      color: "#6554C0",
    })),
  );

  // Intelligence
  ensureRoom(doc, 40, left, contentW, fonts, cont);
  sectionTitle(doc, fonts, left, "Clinical intelligence");
  data.intelligence.forEach((item, idx) => {
    ensureRoom(doc, 48, left, contentW, fonts, cont);
    const sevColor =
      item.severity === "critical"
        ? "#dc2626"
        : item.severity === "warning"
          ? "#ea580c"
          : item.severity === "success"
            ? "#16a34a"
            : BRAND.primary;
    doc.save();
    doc.roundedRect(left, doc.y, contentW, 4, 2).fill(sevColor);
    doc.restore();
    doc.y += 8;
    doc
      .font(fonts.semi)
      .fontSize(9)
      .fillColor(BRAND.text)
      .text(`${idx + 1}. ${item.title}`, left, doc.y, {
        width: contentW,
        lineBreak: false,
      });
    doc.y += 12;
    doc
      .font(fonts.body)
      .fontSize(8.5)
      .fillColor(BRAND.muted)
      .text(item.detail, left, doc.y, { width: contentW });
    doc.y += 10;
  });

  doc.y += 8;
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text(
      "Confidential — for the named practitioner only. Generated by 24/7 DigiHealth.",
      left,
      doc.y,
      { width: contentW, align: "center" },
    );

  doc.end();
  const buffer = await done;
  return { buffer };
}
