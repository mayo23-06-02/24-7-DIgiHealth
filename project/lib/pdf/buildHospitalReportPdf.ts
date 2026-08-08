/**
 * Branded hospital facility report PDF with KPIs, charts, tables, intelligence.
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

type ReportPayload = Awaited<
  ReturnType<typeof import("@/lib/hospital/buildHospitalReports").buildHospitalReport>
>;

function ensureRoom(
  doc: PdfDoc,
  need: number,
  left: number,
  contentW: number,
  fonts: ReturnType<typeof registerBrandFonts>,
) {
  const bottom = doc.page.height - PAGE_MARGIN - 12;
  if (doc.y + need <= bottom) return;
  doc.addPage();
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text("Facility report (continued)", left, PAGE_MARGIN, {
      lineBreak: false,
    });
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
    .fontSize(11)
    .fillColor(BRAND.text)
    .text(title, left, doc.y, { lineBreak: false });
  doc.y += 14;
}

function drawHBar(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  contentW: number,
  rows: { label: string; value: number; color?: string }[],
) {
  if (!rows.length) {
    doc
      .font(fonts.body)
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text("No data.", left, doc.y);
    doc.y += 14;
    return;
  }
  const maxVal = Math.max(...rows.map((r) => r.value), 1);
  const labelW = 100;
  const barW = contentW - labelW - 40;
  rows.slice(0, 10).forEach((row) => {
    const y = doc.y;
    doc
      .font(fonts.body)
      .fontSize(8)
      .fillColor(BRAND.text)
      .text(row.label.slice(0, 24), left, y + 2, {
        width: labelW - 4,
        lineBreak: false,
        ellipsis: true,
      });
    const w = Math.max(3, (row.value / maxVal) * barW);
    doc.save();
    doc
      .roundedRect(left + labelW, y, w, 11, 2)
      .fill(row.color || BRAND.primary);
    doc.restore();
    doc
      .font(fonts.mono)
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text(String(row.value), left + labelW + w + 5, y + 2, {
        lineBreak: false,
      });
    doc.y = y + 16;
  });
  doc.y += 4;
}

function drawTable(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  contentW: number,
  columns: { key: string; label: string; w: number }[],
  rows: Record<string, any>[],
  maxRows = 25,
) {
  if (!rows.length) {
    doc
      .font(fonts.body)
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text("No rows for current filters.", left, doc.y);
    doc.y += 14;
    return;
  }
  const rowH = 16;
  // header
  const headerY = doc.y;
  doc.save();
  doc.roundedRect(left, headerY, contentW, rowH, 3).fill(BRAND.primary);
  doc.restore();
  let x = left;
  columns.forEach((col) => {
    doc
      .font(fonts.monoBold || fonts.mono)
      .fontSize(7)
      .fillColor(BRAND.white)
      .text(col.label, x + 4, headerY + 4, {
        width: col.w - 6,
        lineBreak: false,
      });
    x += col.w;
  });
  doc.y = headerY + rowH + 1;

  rows.slice(0, maxRows).forEach((row, idx) => {
    ensureRoom(doc, rowH + 4, left, contentW, fonts);
    const rowY = doc.y;
    if (idx % 2 === 1) {
      doc.save();
      doc.rect(left, rowY, contentW, rowH).fill(BRAND.soft);
      doc.restore();
    }
    let cx = left;
    columns.forEach((col) => {
      let val = row[col.key];
      if (val instanceof Date) val = val.toISOString().slice(0, 10);
      if (typeof val === "boolean") val = val ? "Yes" : "No";
      doc
        .font(fonts.body)
        .fontSize(7.5)
        .fillColor(BRAND.text)
        .text(String(val ?? "—").slice(0, 40), cx + 4, rowY + 4, {
          width: col.w - 6,
          lineBreak: false,
          ellipsis: true,
        });
      cx += col.w;
    });
    doc.y = rowY + rowH;
  });
  if (rows.length > maxRows) {
    doc.y += 4;
    doc
      .font(fonts.mono)
      .fontSize(7)
      .fillColor(BRAND.muted)
      .text(`Showing ${maxRows} of ${rows.length} rows`, left, doc.y);
    doc.y += 12;
  } else {
    doc.y += 8;
  }
}

export async function buildHospitalReportPdf(
  report: ReportPayload,
): Promise<{ buffer: Buffer }> {
  const doc = createPdfDocument({
    info: {
      Title: `Facility Report — ${report.meta.facilityName}`,
      Author: report.meta.adminName,
      Subject: "DigiHealth hospital operational report",
    },
  });
  const fonts = registerBrandFonts(doc);
  const done = pdfToBuffer(doc);
  const left = PAGE_MARGIN;
  const contentW = doc.page.width - PAGE_MARGIN * 2;

  // Header
  doc.save();
  doc.rect(0, 0, doc.page.width, 6).fill(BRAND.primary);
  doc.restore();
  const { height: logoH } = drawBrandLogo(doc, left, 16, {
    height: 28,
    width: 180,
  });
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text("FACILITY REPORT", left, 18, {
      width: contentW,
      align: "right",
      lineBreak: false,
    });
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.primary)
    .text(report.meta.type.toUpperCase(), left, 30, {
      width: contentW,
      align: "right",
      lineBreak: false,
    });
  doc.y = 16 + Math.max(logoH, 28) + 12;
  doc
    .moveTo(left, doc.y)
    .lineTo(left + contentW, doc.y)
    .strokeColor(BRAND.primary)
    .lineWidth(1.2)
    .stroke();
  doc.y += 12;

  doc
    .font(fonts.bold)
    .fontSize(15)
    .fillColor(BRAND.text)
    .text(report.meta.facilityName, left, doc.y, { lineBreak: false });
  doc.y += 18;
  doc
    .font(fonts.body)
    .fontSize(9)
    .fillColor(BRAND.muted)
    .text(
      [
        `Prepared for ${report.meta.adminName}`,
        report.meta.from || report.meta.to
          ? `Period: ${report.meta.from || "…"} → ${report.meta.to || "…"}`
          : "Period: All time",
        `Generated ${new Date(report.meta.generatedAt).toLocaleString("en-ZA")}`,
      ].join("  ·  "),
      left,
      doc.y,
      { width: contentW },
    );
  doc.y += 16;

  // KPI strip
  ensureRoom(doc, 48, left, contentW, fonts);
  const kpis = [
    { label: "DOCTORS", value: String(report.kpi.doctorCount) },
    { label: "PATIENTS", value: String(report.kpi.patientCount) },
    { label: "APPTS", value: String(report.kpi.appointmentCount) },
    {
      label: "REVENUE",
      value: `R ${Math.round(report.kpi.revenuePeriod || 0).toLocaleString("en-ZA")}`,
    },
    { label: "HIGH RISK", value: String(report.kpi.highRiskPatients) },
    { label: "STAFF", value: String(report.kpi.staffCount) },
  ];
  const cellW = contentW / kpis.length;
  const stripY = doc.y;
  doc.save();
  doc.roundedRect(left, stripY, contentW, 38, 5).fill(BRAND.soft);
  doc.restore();
  kpis.forEach((k, i) => {
    const x = left + i * cellW + 6;
    doc
      .font(fonts.mono)
      .fontSize(6)
      .fillColor(BRAND.muted)
      .text(k.label, x, stripY + 7, { lineBreak: false });
    doc
      .font(fonts.bold)
      .fontSize(11)
      .fillColor(BRAND.primary)
      .text(k.value, x, stripY + 18, { lineBreak: false });
  });
  doc.y = stripY + 50;

  // Intelligence
  ensureRoom(doc, 40, left, contentW, fonts);
  sectionTitle(doc, fonts, left, "Operational intelligence");
  report.intelligence.slice(0, 6).forEach((item, idx) => {
    ensureRoom(doc, 36, left, contentW, fonts);
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
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text(item.detail, left, doc.y, { width: contentW });
    doc.y += 8;
  });

  // Charts as bars
  ensureRoom(doc, 100, left, contentW, fonts);
  sectionTitle(doc, fonts, left, "Risk distribution (patients)");
  drawHBar(
    doc,
    fonts,
    left,
    contentW,
    report.charts.riskDist.map((r) => ({
      label: r.label,
      value: r.value,
      color: r.color,
    })),
  );

  ensureRoom(doc, 100, left, contentW, fonts);
  sectionTitle(doc, fonts, left, "Staff by role");
  drawHBar(
    doc,
    fonts,
    left,
    contentW,
    report.charts.staffByRole.map((r) => ({
      label: r.role,
      value: r.count,
    })),
  );

  ensureRoom(doc, 100, left, contentW, fonts);
  sectionTitle(doc, fonts, left, "Departments");
  drawHBar(
    doc,
    fonts,
    left,
    contentW,
    report.charts.departmentBreakdown.map((d) => ({
      label: d.department,
      value: d.staff,
      color: BRAND.secondary,
    })),
  );

  // Tables by type
  const type = report.meta.type;

  if (type === "doctors" || type === "overview" || type === "facility") {
    ensureRoom(doc, 60, left, contentW, fonts);
    sectionTitle(doc, fonts, left, "Doctors");
    drawTable(
      doc,
      fonts,
      left,
      contentW,
      [
        { key: "name", label: "DOCTOR", w: 120 },
        { key: "department", label: "DEPT", w: 80 },
        { key: "isOnDuty", label: "DUTY", w: 40 },
        { key: "appointments", label: "APPTS", w: 50 },
        { key: "completed", label: "DONE", w: 45 },
        { key: "rating", label: "★", w: 40 },
        { key: "specialisation", label: "SPEC", w: 124 },
      ],
      report.tables.doctors,
    );
  }

  if (type === "patients" || type === "overview" || type === "facility") {
    ensureRoom(doc, 60, left, contentW, fonts);
    sectionTitle(doc, fonts, left, "Patients");
    drawTable(
      doc,
      fonts,
      left,
      contentW,
      [
        { key: "name", label: "PATIENT", w: 110 },
        { key: "visits", label: "VISITS", w: 45 },
        { key: "completed", label: "DONE", w: 45 },
        { key: "riskScore", label: "RISK", w: 40 },
        { key: "riskLabel", label: "BAND", w: 70 },
        { key: "lastDoctor", label: "LAST DR", w: 90 },
        { key: "lastVisit", label: "LAST", w: 99 },
      ],
      report.tables.patients.map((p) => ({
        ...p,
        lastVisit: p.lastVisit
          ? new Date(p.lastVisit).toISOString().slice(0, 10)
          : "—",
      })),
    );
  }

  if (type === "financial" || type === "overview") {
    ensureRoom(doc, 60, left, contentW, fonts);
    sectionTitle(doc, fonts, left, "Financial transactions");
    drawTable(
      doc,
      fonts,
      left,
      contentW,
      [
        { key: "date", label: "DATE", w: 75 },
        { key: "patient", label: "PATIENT", w: 110 },
        { key: "type", label: "TYPE", w: 80 },
        { key: "amount", label: "AMOUNT", w: 60 },
        { key: "status", label: "STATUS", w: 60 },
        { key: "method", label: "METHOD", w: 114 },
      ],
      report.tables.financial.map((f) => ({
        ...f,
        date: f.date ? new Date(f.date).toISOString().slice(0, 10) : "—",
      })),
    );
  }

  if (type === "staff") {
    ensureRoom(doc, 60, left, contentW, fonts);
    sectionTitle(doc, fonts, left, "Staff directory");
    drawTable(
      doc,
      fonts,
      left,
      contentW,
      [
        { key: "name", label: "NAME", w: 120 },
        { key: "role", label: "ROLE", w: 70 },
        { key: "department", label: "DEPT", w: 90 },
        { key: "isOnDuty", label: "DUTY", w: 45 },
        { key: "shiftStart", label: "START", w: 50 },
        { key: "shiftEnd", label: "END", w: 50 },
        { key: "hourlyRate", label: "RATE", w: 74 },
      ],
      report.tables.staff,
    );
  }

  if (type === "appointments") {
    ensureRoom(doc, 60, left, contentW, fonts);
    sectionTitle(doc, fonts, left, "Appointments");
    drawTable(
      doc,
      fonts,
      left,
      contentW,
      [
        { key: "scheduledStart", label: "WHEN", w: 90 },
        { key: "patient", label: "PATIENT", w: 100 },
        { key: "doctor", label: "DOCTOR", w: 100 },
        { key: "type", label: "TYPE", w: 70 },
        { key: "status", label: "STATUS", w: 70 },
        { key: "room", label: "ROOM", w: 69 },
      ],
      report.tables.appointments.map((a) => ({
        ...a,
        scheduledStart: a.scheduledStart
          ? new Date(a.scheduledStart).toISOString().slice(0, 16).replace("T", " ")
          : "—",
      })),
    );
  }

  doc.y += 6;
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text(
      "Confidential — DigiHealth facility report. For authorised hospital administrators only.",
      left,
      doc.y,
      { width: contentW, align: "center" },
    );

  doc.end();
  const buffer = await done;
  return { buffer };
}
