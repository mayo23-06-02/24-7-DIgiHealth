/**
 * Safe PDFKit factory for Next.js with DigiHealth brand fonts.
 * Outfit (body/headings) + Space Mono (labels/meta).
 * Logo: public/Logo-Main.svg via svg-to-pdfkit.
 */
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

export type PdfDoc = InstanceType<typeof PDFDocument>;

/** Brand primary from globals.css --color-primary */
export const BRAND = {
  primary: "#4493b8",
  primaryDark: "#2b617a",
  secondary: "#53CBF3",
  accent: "#FFDE42",
  text: "#0A0A2E",
  muted: "#64748b",
  soft: "#F1F5F9",
  line: "#e2e8f0",
  white: "#FFFFFF",
} as const;

/** Small bottom pad (no footer — keep tight to avoid blank pages) */
export const FOOTER_SAFE = 24;
export const PAGE_MARGIN = 48;

const FONT_DIR = path.join(process.cwd(), "lib", "pdf", "fonts");

const FONT_FILES = {
  Outfit: "Outfit-Regular.ttf",
  "Outfit-SemiBold": "Outfit-SemiBold.ttf",
  "Outfit-Bold": "Outfit-Bold.ttf",
  SpaceMono: "SpaceMono-Regular.ttf",
  "SpaceMono-Bold": "SpaceMono-Bold.ttf",
} as const;

function fontPath(file: string): string | null {
  const p = path.join(FONT_DIR, file);
  return fs.existsSync(p) ? p : null;
}

export function registerBrandFonts(doc: PdfDoc): {
  body: string;
  semi: string;
  bold: string;
  mono: string;
  monoBold: string;
} {
  const map: Record<string, string> = {};
  for (const [name, file] of Object.entries(FONT_FILES)) {
    const full = fontPath(file);
    if (full) {
      try {
        doc.registerFont(name, full);
        map[name] = name;
      } catch (e) {
        console.warn(`[pdf] failed to register ${name}`, e);
      }
    }
  }
  return {
    body: map.Outfit || "Helvetica",
    semi: map["Outfit-SemiBold"] || map["Outfit-Bold"] || "Helvetica-Bold",
    bold: map["Outfit-Bold"] || "Helvetica-Bold",
    mono: map.SpaceMono || "Courier",
    monoBold: map["SpaceMono-Bold"] || "Courier-Bold",
  };
}

export function getLogoSvgPath(): string {
  return path.join(process.cwd(), "public", "Logo-Main.svg");
}

export function getLogoSvg(): string | null {
  const p = getLogoSvgPath();
  if (!fs.existsSync(p)) return null;
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

/**
 * Draw Logo-Main.svg into the PDF (preferred).
 * Falls back to PNG mark if svg-to-pdfkit unavailable.
 */
export function drawBrandLogo(
  doc: PdfDoc,
  x: number,
  y: number,
  opts: { width?: number; height?: number } = {},
): { width: number; height: number } {
  const height = opts.height ?? 32;
  const width = opts.width ?? height * (2189.51 / 699.49); // viewBox aspect

  const svg = getLogoSvg();
  if (svg) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SVGtoPDF = require("svg-to-pdfkit");
      SVGtoPDF(doc, svg, x, y, {
        width,
        height,
        preserveAspectRatio: "xMinYMid meet",
      });
      return { width, height };
    } catch (e) {
      console.warn("[pdf] svg-to-pdfkit failed, using PNG fallback", e);
    }
  }

  // PNG fallback
  const pngCandidates = [
    path.join(process.cwd(), "public", "Logo-Main-pdf.png"),
    path.join(process.cwd(), "public", "Logo-Main.png"),
  ];
  for (const p of pngCandidates) {
    if (fs.existsSync(p)) {
      try {
        doc.image(p, x, y, { height });
        return { width: height * 3, height };
      } catch {
        /* continue */
      }
    }
  }
  return { width: 0, height: 0 };
}

export function createPdfDocument(
  options: PDFKit.PDFDocumentOptions = {},
): PdfDoc {
  return new PDFDocument({
    size: "A4",
    autoFirstPage: true,
    // No bufferPages — was used only for footers and can leave empty trailing pages
    bufferPages: false,
    margin: PAGE_MARGIN,
    ...options,
  });
}

export function pdfToBuffer(doc: PdfDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export function pdfResponse(buffer: Buffer, filename: string): Response {
  const safe = filename.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Content bottom Y before footer zone */
export function contentBottom(doc: PdfDoc): number {
  return doc.page.height - FOOTER_SAFE - 8;
}

/** True if `need` points fit above the footer */
export function hasRoom(doc: PdfDoc, need: number): boolean {
  return doc.y + need <= contentBottom(doc);
}
