import { ImportJob, ImportJobRow } from "@/lib/models/ProvisioningTokens";
import type { ImportKind } from "./columns";
import { validateRow, type RawRow } from "./rows";
import { ProvisionError, provisionDoctor, provisionPatient, type ProvisionResult } from "./service";
import { normalizeFileNumber } from "@/lib/facility/fileNumber";

export const PROCESS_BATCH = 20;
const CONCURRENCY = 5;

/** Fields kept on a finished row so the report stays readable without keeping personal data. */
const KEEP: Record<ImportKind, string[]> = {
  patients: ["file_number", "first_name", "last_name"],
  doctors: ["staff_number", "first_name", "last_name"],
};

const numberKey = (kind: ImportKind) => (kind === "patients" ? "file_number" : "staff_number");

/**
 * Validate a parsed file and store it as a job. Rows that fail validation (or repeat a number or
 * email inside the file) are recorded as failed straight away; the rest wait as `pending` until
 * processed in batches.
 */
export async function createImportJob(params: {
  facilityId: string;
  kind: ImportKind;
  uploadedBy: string;
  fileName: string;
  rows: RawRow[];
}) {
  const { facilityId, kind, uploadedBy, fileName, rows } = params;
  const seenNumbers = new Set<string>();
  const seenEmails = new Set<string>();

  const prepared = rows.map((raw, i) => {
    const errors: string[] = [];
    const parsed = validateRow(kind, raw);
    if (!parsed.ok) errors.push(...parsed.errors);

    const num = normalizeFileNumber(raw[numberKey(kind)]).toLowerCase();
    const email = String(raw.email ?? "").trim().toLowerCase();
    if (num) {
      if (seenNumbers.has(num)) errors.push(`${numberKey(kind)} appears more than once in the file`);
      seenNumbers.add(num);
    }
    if (email) {
      if (seenEmails.has(email)) errors.push("email appears more than once in the file");
      seenEmails.add(email);
    }
    return { raw, rowNumber: i + 2 /* header is row 1 */, errors };
  });

  const failed = prepared.filter((p) => p.errors.length).length;
  const job = await ImportJob.create({
    facilityId,
    kind,
    uploadedBy,
    fileName,
    totalRows: rows.length,
    failedCount: failed,
  });

  const records = prepared.map((p) => ({
    jobId: String(job._id),
    rowNumber: p.rowNumber,
    raw: p.raw,
    status: p.errors.length ? "failed" : "pending",
    error: p.errors.length ? p.errors.join("; ") : undefined,
    fileNumber: normalizeFileNumber(p.raw[numberKey(kind)]) || undefined,
  }));
  for (let i = 0; i < records.length; i += 200) await ImportJobRow.create(records.slice(i, i + 200));

  return { jobId: String(job._id), total: rows.length, failed, pending: rows.length - failed };
}

async function runWithConcurrency<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next++];
        await fn(item);
      }
    }),
  );
}

/** Process the next batch of pending rows for a job. Safe to call repeatedly. */
export async function processImportBatch(
  jobId: string,
  facility: { id: string; name: string },
  actorId: string,
  origin: string,
) {
  const job = await ImportJob.findById(jobId);
  if (!job) throw new Error("Import job not found");
  const kind = job.kind as ImportKind;

  // Claim rows by flipping them out of `pending` first so concurrent callers cannot double-process.
  const candidates = await ImportJobRow.find({ jobId, status: "pending" }).sort({ rowNumber: 1 }).limit(PROCESS_BATCH);
  const claimed: typeof candidates = [];
  for (const c of candidates) {
    const won = await ImportJobRow.findOneAndUpdate(
      { _id: c._id, status: "pending" },
      { $set: { status: "skipped", error: "processing" } },
      { new: true },
    );
    if (won) claimed.push(c);
  }

  const counts = { created: 0, linked: 0, skipped: 0, failed: 0 };
  await runWithConcurrency(claimed, CONCURRENCY, async (row) => {
    const parsed = validateRow(kind, row.raw as RawRow);
    let patch: Record<string, unknown>;
    if (!parsed.ok) {
      patch = { status: "failed", error: parsed.errors.join("; ") };
      counts.failed++;
    } else {
      try {
        const ctx = { facility, actorId, via: "hospital_import" as const, origin };
        const result: ProvisionResult =
          kind === "patients"
            ? await provisionPatient(parsed.value as never, ctx)
            : await provisionDoctor(parsed.value as never, ctx);
        patch = {
          status: result.status,
          userId: result.userId,
          fileNumber: result.fileNumber,
          error: result.warning,
        };
        counts[result.status]++;
      } catch (err) {
        const message = err instanceof ProvisionError ? err.message : "unexpected error";
        if (!(err instanceof ProvisionError)) console.error("[import] row failed", err);
        patch = { status: "failed", error: message };
        counts.failed++;
      }
    }
    const keep: Record<string, unknown> = {};
    for (const k of KEEP[kind]) keep[k] = (row.raw as RawRow)[k];
    await ImportJobRow.updateOne({ _id: row._id }, { $set: { ...patch, raw: keep } });
  });

  await ImportJob.updateOne(
    { _id: jobId },
    {
      $inc: {
        createdCount: counts.created,
        linkedCount: counts.linked,
        skippedCount: counts.skipped,
        failedCount: counts.failed,
      },
    },
  );
  const remaining = await ImportJobRow.countDocuments({ jobId, status: "pending" });
  return { processed: claimed.length, remaining, ...counts };
}

export async function getImportJobSummary(jobId: string) {
  const job = await ImportJob.findById(jobId).lean();
  if (!job) return null;
  const remaining = await ImportJobRow.countDocuments({ jobId, status: "pending" });
  return { ...job, remaining };
}
