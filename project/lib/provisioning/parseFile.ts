import Papa from "papaparse";
import ExcelJS from "exceljs";
import { COLUMNS, TEMPLATE_KEYS, canonicalHeader, type ImportKind } from "./columns";

const templateSpec = (kind: ImportKind) =>
  TEMPLATE_KEYS[kind].map((k) => COLUMNS[kind].find((c) => c.key === k)!).filter(Boolean);
import type { RawRow } from "./rows";

export const MAX_IMPORT_ROWS = 2000;

export interface ParsedFile {
  rows: RawRow[];
  /** Required headers missing from the file. */
  missingHeaders: string[];
  /** Headers in the file that are not part of the standard format (ignored). */
  unknownHeaders: string[];
}

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
    if (o.richText) return o.richText.map((t) => t.text).join("");
    if (o.result !== undefined) return o.result;
    if (o.text !== undefined) return o.text; // hyperlinked email cells
  }
  return v;
}

/** Read a CSV or XLSX upload into header-keyed rows (blank rows dropped). */
export async function parseImportFile(
  kind: ImportKind,
  fileName: string,
  data: Buffer,
): Promise<ParsedFile> {
  let table: unknown[][] = [];
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(data as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("The workbook has no sheets.");
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? (row.values as ExcelJS.CellValue[]).slice(1) : [];
      table.push(values.map(cellValue));
    });
  } else if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    const text = data.toString("utf8").replace(/^﻿/, "");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
    table = parsed.data;
  } else {
    throw new Error("Upload a .xlsx or .csv file.");
  }

  if (table.length === 0) throw new Error("The file is empty.");
  const headers = table[0].map(canonicalHeader);
  const spec = COLUMNS[kind];
  const known = new Set(spec.map((c) => c.key));
  const missingHeaders = spec.filter((c) => c.required && !headers.includes(c.key)).map((c) => c.key);
  const unknownHeaders = headers.filter((h) => h && !known.has(h));

  const rows: RawRow[] = [];
  for (const r of table.slice(1)) {
    if (r.every((c) => String(c ?? "").trim() === "")) continue;
    const obj: RawRow = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = r[i] ?? "";
    });
    rows.push(obj);
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`A file can hold at most ${MAX_IMPORT_ROWS} rows. Split it into smaller files.`);
  }
  return { rows, missingHeaders, unknownHeaders };
}

/** Template workbook with the standard headers, an example row and a notes sheet. */
export async function buildTemplateXlsx(kind: ImportKind): Promise<Buffer> {
  const spec = templateSpec(kind);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(kind === "patients" ? "Patients" : "Doctors");
  ws.addRow(spec.map((c) => c.key));
  ws.addRow(spec.map((c) => c.example));
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((col, i) => {
    col.width = Math.max(18, spec[i].key.length + 4);
  });
  const help = wb.addWorksheet("Instructions");
  help.addRow(["column", "required", "description", "example"]);
  help.getRow(1).font = { bold: true };
  for (const c of spec) help.addRow([c.key, c.required ? "yes" : "no", c.description, c.example]);
  help.getColumn(1).width = 34;
  help.getColumn(3).width = 70;
  help.getColumn(4).width = 28;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function buildTemplateCsv(kind: ImportKind): string {
  const spec = templateSpec(kind);
  return Papa.unparse([spec.map((c) => c.key), spec.map((c) => c.example)]);
}
