/**
 * Branded billing PDFs — invoices, receipts, and financial reports.
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

export type BillingDocKind = "invoice" | "receipt";

export interface BillingTxnPdf {
  _id?: string;
  id?: string;
  description?: string;
  category?: string;
  amount?: number;
  currency?: string;
  status?: string;
  provider?: string;
  timestamp?: string | Date;
  medicalAidClaimRef?: string;
  providerTransactionId?: string;
  platformFeeAmount?: number;
  practitionerEarnings?: number;
}

export interface BillingParty {
  name: string;
  email?: string;
  role?: string;
  line2?: string;
}

function fmtZAR(n?: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(n || 0);
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function fmtDateTime(d?: string | Date | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function ensureRoom(doc: PdfDoc, need: number) {
  const bottom = doc.page.height - PAGE_MARGIN - 16;
  if (doc.y + need > bottom) {
    doc.addPage();
    doc.y = PAGE_MARGIN;
  }
}

function drawTopBar(doc: PdfDoc) {
  doc.save();
  doc.rect(0, 0, doc.page.width, 6).fill(BRAND.primary);
  doc.restore();
}

function kv(
  doc: PdfDoc,
  fonts: ReturnType<typeof registerBrandFonts>,
  left: number,
  label: string,
  value: string,
  width = 240,
) {
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text(label.toUpperCase(), left, doc.y, { lineBreak: false });
  doc.y += 10;
  doc
    .font(fonts.body)
    .fontSize(10)
    .fillColor(BRAND.text)
    .text(value || "—", left, doc.y, { width, lineBreak: false });
  doc.y += 16;
}

/**
 * Single invoice / receipt PDF for one payment transaction.
 */
export async function buildInvoiceReceiptPdf(opts: {
  kind: BillingDocKind;
  transaction: BillingTxnPdf;
  billTo: BillingParty;
  billFrom?: BillingParty;
}): Promise<{ buffer: Buffer; filename: string }> {
  const { kind, transaction: t, billTo } = opts;
  const billFrom = opts.billFrom || {
    name: "24/7 DigiHealth",
    email: "billing@247digihealth.com",
    line2: "South Africa & Eswatini",
  };

  const doc = createPdfDocument();
  const fonts = registerBrandFonts(doc);
  const left = PAGE_MARGIN;
  const contentW = doc.page.width - PAGE_MARGIN * 2;
  const endPromise = pdfToBuffer(doc);

  drawTopBar(doc);
  const { width: logoW } = drawBrandLogo(doc, left, 18, {
    height: 28,
    width: 180,
  });

  const title = kind === "invoice" ? "TAX INVOICE" : "PAYMENT RECEIPT";
  doc
    .font(fonts.bold)
    .fontSize(16)
    .fillColor(BRAND.text)
    .text(title, left + Math.max(logoW + 16, 160), 22, {
      width: contentW - 160,
      align: "right",
      lineBreak: false,
    });

  const ref =
    t.providerTransactionId ||
    t.medicalAidClaimRef ||
    String(t._id || t.id || "").slice(-10).toUpperCase() ||
    "N/A";

  doc
    .font(fonts.mono)
    .fontSize(8)
    .fillColor(BRAND.muted)
    .text(`Ref ${ref}`, left + Math.max(logoW + 16, 160), 44, {
      width: contentW - 160,
      align: "right",
      lineBreak: false,
    });

  doc.y = 72;
  doc
    .moveTo(left, doc.y)
    .lineTo(left + contentW, doc.y)
    .strokeColor(BRAND.line)
    .lineWidth(0.6)
    .stroke();
  doc.y += 18;

  // Parties
  const colW = contentW / 2 - 8;
  const y0 = doc.y;
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text("FROM", left, y0, { lineBreak: false });
  doc
    .font(fonts.bold)
    .fontSize(11)
    .fillColor(BRAND.text)
    .text(billFrom.name, left, y0 + 12, { width: colW });
  let fromY = doc.y + 2;
  if (billFrom.line2) {
    doc
      .font(fonts.body)
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text(billFrom.line2, left, fromY, { width: colW });
    fromY = doc.y + 2;
  }
  if (billFrom.email) {
    doc
      .font(fonts.body)
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text(billFrom.email, left, fromY, { width: colW });
    fromY = doc.y;
  }

  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text(kind === "invoice" ? "BILL TO" : "PAID BY", left + colW + 16, y0, {
      lineBreak: false,
    });
  doc
    .font(fonts.bold)
    .fontSize(11)
    .fillColor(BRAND.text)
    .text(billTo.name, left + colW + 16, y0 + 12, { width: colW });
  let toY = doc.y + 2;
  if (billTo.email) {
    doc
      .font(fonts.body)
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text(billTo.email, left + colW + 16, toY, { width: colW });
    toY = doc.y + 2;
  }
  if (billTo.role) {
    doc
      .font(fonts.body)
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text(billTo.role, left + colW + 16, toY, { width: colW });
    toY = doc.y;
  }

  doc.y = Math.max(fromY, toY) + 18;

  // Meta grid
  const metaY = doc.y;
  doc.save();
  doc.roundedRect(left, metaY, contentW, 52, 6).fill(BRAND.soft);
  doc.restore();
  doc.y = metaY + 10;
  const mCols = [
    { l: "Date", v: fmtDateTime(t.timestamp) },
    { l: "Status", v: (t.status || "—").toUpperCase() },
    { l: "Method", v: (t.provider || "—").replace(/_/g, " ") },
    { l: "Category", v: (t.category || "—").replace(/_/g, " ") },
  ];
  mCols.forEach((c, i) => {
    const x = left + 12 + i * (contentW / 4);
    doc
      .font(fonts.mono)
      .fontSize(7)
      .fillColor(BRAND.muted)
      .text(c.l.toUpperCase(), x, metaY + 12, { lineBreak: false });
    doc
      .font(fonts.semi)
      .fontSize(9)
      .fillColor(BRAND.text)
      .text(c.v, x, metaY + 26, {
        width: contentW / 4 - 16,
        lineBreak: false,
        ellipsis: true,
      });
  });
  doc.y = metaY + 64;

  // Line items
  doc
    .font(fonts.bold)
    .fontSize(11)
    .fillColor(BRAND.text)
    .text("Line items", left, doc.y, { lineBreak: false });
  doc.y += 14;

  // Table header
  const lineItemsHeaderY = doc.y;
  doc.save();
  doc.rect(left, lineItemsHeaderY, contentW, 22).fill(BRAND.primary);
  doc.restore();
  doc
    .font(fonts.monoBold)
    .fontSize(8)
    .fillColor(BRAND.white)
    .text("Description", left + 10, lineItemsHeaderY + 7, { lineBreak: false })
    .text("Amount", left + contentW - 90, lineItemsHeaderY + 7, {
      width: 80,
      align: "right",
      lineBreak: false,
    });
  doc.y = lineItemsHeaderY + 28;

  doc
    .font(fonts.body)
    .fontSize(10)
    .fillColor(BRAND.text)
    .text(t.description || "Healthcare service", left + 10, doc.y, {
      width: contentW - 120,
    });
  const descBottom = doc.y;
  doc
    .font(fonts.bold)
    .fontSize(10)
    .fillColor(BRAND.text)
    .text(fmtZAR(t.amount), left + contentW - 90, descBottom - 12, {
      width: 80,
      align: "right",
      lineBreak: false,
    });
  doc.y = Math.max(doc.y, descBottom) + 8;

  if (t.platformFeeAmount) {
    const feeY = doc.y;
    doc
      .font(fonts.body)
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text("Platform fee", left + 10, feeY, { lineBreak: false })
      .text(fmtZAR(20), left + contentW - 90, feeY, {
        width: 80,
        align: "right",
        lineBreak: false,
      });
    doc.y = feeY + 14;
  }

  doc
    .moveTo(left, doc.y)
    .lineTo(left + contentW, doc.y)
    .strokeColor(BRAND.line)
    .lineWidth(0.5)
    .stroke();
  doc.y += 12;

  // Total
  doc.save();
  doc.restore();
  doc
    .font(fonts.mono)
    .fontSize(8)
    .fillColor(BRAND.muted)
    .text("TOTAL (ZAR)", left + contentW - 188, doc.y + 8, {
      lineBreak: false,
    });
  doc
    .font(fonts.bold)
    .fontSize(14)
    .fillColor(BRAND.primaryDark)
    .text(fmtZAR((t.amount) +20), left + contentW - 188, doc.y + 20, {
      width: 176,
      align: "right",
      lineBreak: false,
    });
  doc.y += 56;

  doc
    .font(fonts.body)
    .fontSize(8)
    .fillColor(BRAND.muted)
    .text(
      kind === "receipt"
        ? "This receipt confirms payment recorded on the DigiHealth platform. It is not a tax invoice unless marked as such by your facility."
        : "This invoice was generated by DigiHealth for record-keeping. Retain for medical aid or personal accounting.",
      left,
      doc.y,
      { width: contentW },
    );
  doc.y += 28;
  doc
    .font(fonts.mono)
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text(
      `Generated ${fmtDateTime(new Date())} · 24/7 DigiHealth`,
      left,
      doc.y,
      { lineBreak: false },
    );

  doc.end();
  const buffer = await endPromise;
  const day = new Date(t.timestamp || Date.now()).toISOString().slice(0, 10);
  const filename = `${kind === "invoice" ? "Invoice" : "Receipt"}_${ref}_${day}.pdf`;
  return { buffer, filename };
}

export interface BillingReportPdfOptions {
  title?: string;
  generatedFor: BillingParty;
  summary: Record<string, string | number>;
  transactions?: BillingTxnPdf[];
  payouts?: Array<{
    amount?: number;
    status?: string;
    consultationCount?: number;
    periodFrom?: string | Date;
    periodTo?: string | Date;
    requestedAt?: string | Date;
    practitionerName?: string;
  }>;
  notes?: string;
}

/**
 * Multi-page financial / billing report PDF.
 */
export async function buildBillingReportPdf(
  opts: BillingReportPdfOptions,
): Promise<{ buffer: Buffer; filename: string; count: number }> {
  const doc = createPdfDocument();
  const fonts = registerBrandFonts(doc);
  const left = PAGE_MARGIN;
  const contentW = doc.page.width - PAGE_MARGIN * 2;
  const endPromise = pdfToBuffer(doc);

  drawTopBar(doc);
  drawBrandLogo(doc, left, 16, { height: 28, width: 180 });

  doc.y = 56;
  doc
    .font(fonts.bold)
    .fontSize(18)
    .fillColor(BRAND.text)
    .text(opts.title || "Billing Report", left, doc.y, { lineBreak: false });
  doc.y += 22;
  doc
    .font(fonts.body)
    .fontSize(10)
    .fillColor(BRAND.muted)
    .text(
      `Prepared for ${opts.generatedFor.name}${opts.generatedFor.email ? ` · ${opts.generatedFor.email}` : ""}`,
      left,
      doc.y,
      { width: contentW },
    );
  doc.y += 6;
  doc
    .font(fonts.mono)
    .fontSize(8)
    .fillColor(BRAND.muted)
    .text(`Generated ${fmtDateTime(new Date())}`, left, doc.y, {
      lineBreak: false,
    });
  doc.y += 18;

  // Summary cards
  const entries = Object.entries(opts.summary || {}).slice(0, 6);
  if (entries.length) {
    const cardW = (contentW - 12 * (Math.min(entries.length, 3) - 1)) / Math.min(entries.length, 3);
    let x = left;
    let rowY = doc.y;
    entries.forEach((entry, i) => {
      if (i > 0 && i % 3 === 0) {
        rowY += 58;
        x = left;
      }
      ensureRoom(doc, 70);
      if (i % 3 === 0) doc.y = rowY;
      doc.save();
      doc.roundedRect(x, rowY, cardW, 50, 6).fill(BRAND.soft);
      doc.restore();
      doc
        .font(fonts.mono)
        .fontSize(7)
        .fillColor(BRAND.muted)
        .text(String(entry[0]).toUpperCase(), x + 10, rowY + 10, {
          width: cardW - 20,
          lineBreak: false,
          ellipsis: true,
        });
      doc
        .font(fonts.bold)
        .fontSize(12)
        .fillColor(BRAND.text)
        .text(String(entry[1]), x + 10, rowY + 26, {
          width: cardW - 20,
          lineBreak: false,
          ellipsis: true,
        });
      x += cardW + 12;
    });
    doc.y = rowY + 62;
  }

  // Transactions table
  const txns = opts.transactions || [];
  if (txns.length) {
    ensureRoom(doc, 40);
    doc
      .font(fonts.bold)
      .fontSize(12)
      .fillColor(BRAND.text)
      .text(`Transactions (${txns.length})`, left, doc.y, { lineBreak: false });
    doc.y += 14;

    const col = {
      date: left,
      desc: left + 70,
      cat: left + 250,
      amount: left + contentW - 140,
      status: left + contentW - 70,
    };

    const drawTxnHeader = () => {
      const y = doc.y;
      doc.save();
      doc.rect(left, y, contentW, 18).fill(BRAND.primary);
      doc.restore();
      doc
        .font(fonts.monoBold)
        .fontSize(7)
        .fillColor(BRAND.white)
        .text("DATE", col.date + 6, y + 5, { lineBreak: false })
        .text("DESCRIPTION", col.desc, y + 5, { lineBreak: false })
        .text("CATEGORY", col.cat, y + 5, { lineBreak: false })
        .text("AMOUNT", col.amount, y + 5, { lineBreak: false })
        .text("STATUS", col.status, y + 5, { lineBreak: false });
      doc.y = y + 22;
    };

    drawTxnHeader();

    txns.forEach((t, idx) => {
      ensureRoom(doc, 22);
      if (doc.y < PAGE_MARGIN + 30) drawTxnHeader();
      const rowY = doc.y;
      if (idx % 2 === 0) {
        doc.save();
        doc.rect(left, rowY - 2, contentW, 18).fill("#f8fafc");
        doc.restore();
      }
      doc
        .font(fonts.body)
        .fontSize(8)
        .fillColor(BRAND.text)
        .text(fmtDate(t.timestamp), col.date + 6, rowY, {
          width: 60,
          lineBreak: false,
        })
        .text((t.description || "—").slice(0, 36), col.desc, rowY, {
          width: 170,
          lineBreak: false,
          ellipsis: true,
        })
        .text((t.category || "—").replace(/_/g, " ").slice(0, 14), col.cat, rowY, {
          width: 70,
          lineBreak: false,
        })
        .text(fmtZAR(t.amount), col.amount, rowY, {
          width: 60,
          lineBreak: false,
        })
        .text((t.status || "—").slice(0, 10), col.status, rowY, {
          width: 58,
          lineBreak: false,
        });
      doc.y = rowY + 16;
    });
    doc.y += 10;
  }

  // Payouts
  const payouts = opts.payouts || [];
  if (payouts.length) {
    ensureRoom(doc, 40);
    doc
      .font(fonts.bold)
      .fontSize(12)
      .fillColor(BRAND.text)
      .text(`Payouts (${payouts.length})`, left, doc.y, { lineBreak: false });
    doc.y += 14;

    payouts.forEach((p) => {
      ensureRoom(doc, 28);
      const period = `${fmtDate(p.periodFrom)} – ${fmtDate(p.periodTo)}`;
      const label = p.practitionerName
        ? `${p.practitionerName} · ${period}`
        : period;
      const rowY = doc.y;
      doc
        .font(fonts.body)
        .fontSize(9)
        .fillColor(BRAND.text)
        .text(label, left, rowY, { width: contentW - 140, lineBreak: false })
        .text(fmtZAR(p.amount), left + contentW - 130, rowY, {
          width: 70,
          lineBreak: false,
        })
        .text((p.status || "—").toUpperCase(), left + contentW - 55, rowY, {
          width: 50,
          lineBreak: false,
        });
      doc.y = rowY + 14;
      doc
        .font(fonts.mono)
        .fontSize(7)
        .fillColor(BRAND.muted)
        .text(
          `Consults: ${p.consultationCount ?? "—"} · Requested ${fmtDate(p.requestedAt)}`,
          left,
          doc.y,
          { lineBreak: false },
        );
      doc.y += 14;
    });
  }

  if (opts.notes) {
    ensureRoom(doc, 40);
    doc.y += 6;
    doc
      .font(fonts.body)
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text(opts.notes, left, doc.y, { width: contentW });
  }

  doc.end();
  const buffer = await endPromise;
  const day = new Date().toISOString().slice(0, 10);
  const count = txns.length + payouts.length;
  return {
    buffer,
    filename: `Billing_Report_${day}.pdf`,
    count,
  };
}
