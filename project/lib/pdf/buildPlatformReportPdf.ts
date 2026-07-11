import {
  BRAND,
  createPdfDocument,
  drawBrandLogo,
  PAGE_MARGIN,
  pdfToBuffer,
  registerBrandFonts,
  type PdfDoc,
} from "./createPdfDocument";

type Report = Awaited<
  ReturnType<typeof import("@/lib/admin/buildAdminReports").buildAdminReport>
>;

function ensureRoom(
  doc: PdfDoc,
  need: number,
  left: number,
  contentW: number,
  fonts: ReturnType<typeof registerBrandFonts>,
) {
  if (doc.y + need <= doc.page.height - PAGE_MARGIN - 12) return;
  doc.addPage();
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text("Platform report (continued)", left, PAGE_MARGIN, {
      lineBreak: false,
    });
  doc.y = PAGE_MARGIN + 16;
}

function section(
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

function table(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  contentW: number,
  cols: { key: string; label: string; w: number }[],
  rows: Record<string, any>[],
  max = 30,
) {
  if (!rows.length) {
    doc
      .font(fonts.body)
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text("No rows.", left, doc.y);
    doc.y += 14;
    return;
  }
  const rowH = 15;
  doc.save();
  doc.roundedRect(left, doc.y, contentW, rowH, 3).fill(BRAND.primary);
  doc.restore();
  let x = left;
  cols.forEach((c) => {
    doc
      .font(fonts.monoBold || fonts.mono)
      .fontSize(7)
      .fillColor(BRAND.white)
      .text(c.label, x + 3, doc.y + 4, { width: c.w - 4, lineBreak: false });
    x += c.w;
  });
  doc.y += rowH + 1;
  rows.slice(0, max).forEach((row, i) => {
    ensureRoom(doc, rowH + 2, left, contentW, fonts);
    if (i % 2) {
      doc.save();
      doc.rect(left, doc.y, contentW, rowH).fill(BRAND.soft);
      doc.restore();
    }
    let cx = left;
    cols.forEach((c) => {
      let v = row[c.key];
      if (v instanceof Date) v = v.toISOString().slice(0, 10);
      if (typeof v === "boolean") v = v ? "Yes" : "No";
      doc
        .font(fonts.body)
        .fontSize(7)
        .fillColor(BRAND.text)
        .text(String(v ?? "—").slice(0, 36), cx + 3, doc.y + 3, {
          width: c.w - 4,
          lineBreak: false,
          ellipsis: true,
        });
      cx += c.w;
    });
    doc.y += rowH;
  });
  doc.y += 8;
}

export async function buildPlatformReportPdf(
  report: Report,
): Promise<{ buffer: Buffer }> {
  const doc = createPdfDocument({
    info: {
      Title: "DigiHealth Platform Report",
      Author: "DigiHealth Admin",
      Subject: "Platform operational report",
    },
  });
  const fonts = registerBrandFonts(doc);
  const done = pdfToBuffer(doc);
  const left = PAGE_MARGIN;
  const contentW = doc.page.width - PAGE_MARGIN * 2;

  doc.save();
  doc.rect(0, 0, doc.page.width, 6).fill(BRAND.primary);
  doc.restore();
  const { height } = drawBrandLogo(doc, left, 16, { height: 28, width: 180 });
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text("PLATFORM REPORT", left, 18, {
      width: contentW,
      align: "right",
      lineBreak: false,
    });
  doc.y = 16 + Math.max(height, 28) + 12;
  doc
    .moveTo(left, doc.y)
    .lineTo(left + contentW, doc.y)
    .strokeColor(BRAND.primary)
    .lineWidth(1.2)
    .stroke();
  doc.y += 12;

  doc
    .font(fonts.bold)
    .fontSize(16)
    .fillColor(BRAND.text)
    .text("24/7 DigiHealth — Platform Control Report", left, doc.y, {
      lineBreak: false,
    });
  doc.y += 18;
  doc
    .font(fonts.body)
    .fontSize(9)
    .fillColor(BRAND.muted)
    .text(
      `Type: ${report.meta.type}  ·  Generated ${new Date(report.meta.generatedAt).toLocaleString("en-ZA")}`,
      left,
      doc.y,
      { width: contentW },
    );
  doc.y += 16;

  // KPIs
  const k = report.kpi;
  const kpis = [
    { l: "USERS", v: String(k.totalUsers) },
    { l: "PATIENTS", v: String(k.patients) },
    { l: "DOCTORS", v: String(k.practitioners) },
    { l: "FACILITIES", v: String(k.facilities) },
    { l: "CONSULTS 30D", v: String(k.consults30d) },
    { l: "REVENUE 30D", v: `R${k.revenue30d}` },
  ];
  const cellW = contentW / kpis.length;
  const y0 = doc.y;
  doc.save();
  doc.roundedRect(left, y0, contentW, 36, 5).fill(BRAND.soft);
  doc.restore();
  kpis.forEach((item, i) => {
    const x = left + i * cellW + 6;
    doc
      .font(fonts.mono)
      .fontSize(6)
      .fillColor(BRAND.muted)
      .text(item.l, x, y0 + 7, { lineBreak: false });
    doc
      .font(fonts.bold)
      .fontSize(10)
      .fillColor(BRAND.primary)
      .text(item.v, x, y0 + 18, { lineBreak: false });
  });
  doc.y = y0 + 48;

  section(doc, fonts, left, "Intelligence");
  report.intelligence.slice(0, 6).forEach((item, i) => {
    ensureRoom(doc, 32, left, contentW, fonts);
    doc
      .font(fonts.semi)
      .fontSize(9)
      .fillColor(BRAND.text)
      .text(`${i + 1}. ${item.title}`, left, doc.y, { lineBreak: false });
    doc.y += 11;
    doc
      .font(fonts.body)
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text(item.detail, left, doc.y, { width: contentW });
    doc.y += 8;
  });

  const type = report.meta.type;
  if (type === "users" || type === "overview") {
    ensureRoom(doc, 40, left, contentW, fonts);
    section(doc, fonts, left, "Users");
    table(
      doc,
      fonts,
      left,
      contentW,
      [
        { key: "name", label: "NAME", w: 110 },
        { key: "email", label: "EMAIL", w: 140 },
        { key: "role", label: "ROLE", w: 80 },
        { key: "status", label: "STATUS", w: 70 },
        { key: "mfa", label: "MFA", w: 40 },
        { key: "createdAt", label: "JOINED", w: 59 },
      ],
      report.tables.users.map((u) => ({
        ...u,
        createdAt: u.createdAt
          ? new Date(u.createdAt).toISOString().slice(0, 10)
          : "—",
      })),
    );
  }

  if (type === "facilities" || type === "overview") {
    ensureRoom(doc, 40, left, contentW, fonts);
    section(doc, fonts, left, "Facilities");
    table(
      doc,
      fonts,
      left,
      contentW,
      [
        { key: "name", label: "NAME", w: 140 },
        { key: "type", label: "TYPE", w: 70 },
        { key: "city", label: "CITY", w: 90 },
        { key: "isOpen", label: "OPEN", w: 45 },
        { key: "beds", label: "BEDS", w: 50 },
        { key: "emergency", label: "ER", w: 104 },
      ],
      report.tables.facilities,
    );
  }

  if (type === "finance" || type === "overview") {
    ensureRoom(doc, 40, left, contentW, fonts);
    section(doc, fonts, left, "Finance");
    table(
      doc,
      fonts,
      left,
      contentW,
      [
        { key: "date", label: "DATE", w: 80 },
        { key: "amount", label: "AMOUNT", w: 70 },
        { key: "fees", label: "FEES", w: 60 },
        { key: "status", label: "STATUS", w: 70 },
        { key: "category", label: "CATEGORY", w: 100 },
        { key: "provider", label: "PROVIDER", w: 119 },
      ],
      report.tables.finance.map((f) => ({
        ...f,
        date: f.date ? new Date(f.date).toISOString().slice(0, 10) : "—",
      })),
    );
  }

  if (type === "consultations") {
    ensureRoom(doc, 40, left, contentW, fonts);
    section(doc, fonts, left, "Consultations");
    table(
      doc,
      fonts,
      left,
      contentW,
      [
        { key: "scheduledStart", label: "WHEN", w: 100 },
        { key: "status", label: "STATUS", w: 80 },
        { key: "type", label: "TYPE", w: 70 },
        { key: "complaint", label: "COMPLAINT", w: 249 },
      ],
      report.tables.consultations.map((c) => ({
        ...c,
        scheduledStart: c.scheduledStart
          ? new Date(c.scheduledStart).toISOString().slice(0, 16).replace("T", " ")
          : "—",
      })),
    );
  }

  if (type === "audit") {
    ensureRoom(doc, 40, left, contentW, fonts);
    section(doc, fonts, left, "Audit log");
    table(
      doc,
      fonts,
      left,
      contentW,
      [
        { key: "createdAt", label: "WHEN", w: 90 },
        { key: "action", label: "ACTION", w: 120 },
        { key: "actorRole", label: "ROLE", w: 70 },
        { key: "actorEmail", label: "ACTOR", w: 120 },
        { key: "targetType", label: "TARGET", w: 99 },
      ],
      report.tables.audit.map((a) => ({
        ...a,
        createdAt: a.createdAt
          ? new Date(a.createdAt).toISOString().slice(0, 16).replace("T", " ")
          : "—",
      })),
    );
  }

  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text(
      "Confidential — DigiHealth platform administrators only.",
      left,
      doc.y + 8,
      { width: contentW, align: "center" },
    );

  doc.end();
  return { buffer: await done };
}
