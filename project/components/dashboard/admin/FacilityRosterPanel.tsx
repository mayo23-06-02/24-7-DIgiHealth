"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Download, FileSpreadsheet, Search, UploadCloud, UserPlus } from "lucide-react";
import type { ImportKind } from "@/lib/provisioning/columns";
import AddPersonForm from "./AddPersonForm";
import { Modal, ghostBtn, inputClass, primaryBtn } from "./formKit";

interface Props {
  facilityId: string;
  facilityName: string;
  onClose: () => void;
}

interface JobState {
  jobId: string;
  total: number;
  failed: number;
  remaining: number;
  created: number;
  linked: number;
  skipped: number;
}

interface FailedRow {
  rowNumber: number;
  error?: string;
  raw?: Record<string, unknown>;
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  suspended: "bg-red-50 text-red-700",
  discharged: "bg-slate-100 text-slate-600",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Invite sent",
  suspended: "Suspended",
  discharged: "Discharged",
};

/**
 * Platform-admin tool for one hospital: list the people it has issued numbers to, add one
 * person, or upload a spreadsheet. Spreadsheet rows are processed in batches until none remain.
 */
export default function FacilityRosterPanel({ facilityId, facilityName, onClose }: Props) {
  const [kind, setKind] = useState<ImportKind>("patients");
  const [mode, setMode] = useState<"list" | "add" | "upload">("list");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const [failedRows, setFailedRows] = useState<FailedRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const base = `/api/admin/facilities/${facilityId}`;
  const noun = kind === "patients" ? "patient" : "doctor";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/${kind}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setList(json.data ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [base, kind]);

  useEffect(() => {
    void load();
    setMode("list");
    setJob(null);
    setFailedRows([]);
    setUploadError("");
    setQuery("");
  }, [load]);

  const runJob = async (start: JobState) => {
    let state = start;
    while (state.remaining > 0) {
      const res = await fetch(`${base}/import-jobs/${start.jobId}/process`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Processing failed");
      const d = json.data;
      state = {
        ...state,
        remaining: d.remaining,
        created: state.created + (d.created ?? 0),
        linked: state.linked + (d.linked ?? 0),
        skipped: state.skipped + (d.skipped ?? 0),
        failed: state.failed + (d.failed ?? 0),
      };
      setJob(state);
      if (d.processed === 0) break;
    }
    if (state.failed > 0) {
      const r = await fetch(`${base}/import-jobs/${start.jobId}?problems=1`);
      const j = await r.json().catch(() => ({}));
      setFailedRows(j?.data?.rows ?? []);
    }
    toast.success(`Import finished: ${state.created + state.linked} added`);
    void load();
  };

  const upload = async (file: File) => {
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      setUploadError("Choose an .xlsx or .csv file.");
      return;
    }
    setBusy(true);
    setUploadError("");
    setFailedRows([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${base}/${kind}/import`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.error ?? "Upload failed");
        return;
      }
      const d = json.data;
      const start: JobState = { jobId: d.jobId, total: d.total, failed: d.failed, remaining: d.pending, created: 0, linked: 0, skipped: 0 };
      setJob(start);
      await runJob(start);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const resend = async (id: string) => {
    const res = await fetch(`${base}/${kind}/${id}/resend`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (res.ok) toast.success("Invite sent again");
    else toast.error(json.error ?? "Failed");
  };

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`${base}/${kind}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) void load();
    else toast.error(json.error ?? "Failed");
  };

  const person = (r: any) => r.patientId ?? r.userId ?? {};
  const q = query.trim().toLowerCase();
  const visible = q
    ? list.filter((r) => {
        const p = person(r);
        return [r.fileNumber, p.firstName, p.lastName, p.email].some((x) => String(x ?? "").toLowerCase().includes(q));
      })
    : list;
  const processed = job ? job.created + job.linked + job.skipped + job.failed : 0;
  const pct = job && job.total ? Math.round((processed / job.total) * 100) : 0;

  return (
    <Modal title={facilityName} subtitle="Patients and doctors this hospital has issued numbers to" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5" role="tablist">
            {(["patients", "doctors"] as ImportKind[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={k === kind}
                onClick={() => setKind(k)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold ${k === kind ? "bg-white text-primary shadow-sm" : "text-slate-600"}`}
              >
                {k === "patients" ? "Patients" : "Doctors"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={mode === "add" ? primaryBtn : ghostBtn} onClick={() => setMode(mode === "add" ? "list" : "add")}>
              <UserPlus size={16} /> Add {noun}
            </button>
            <button className={mode === "upload" ? primaryBtn : ghostBtn} onClick={() => setMode(mode === "upload" ? "list" : "upload")}>
              <UploadCloud size={16} /> Upload spreadsheet
            </button>
          </div>
        </div>

        {mode === "add" && (
          <AddPersonForm key={kind} kind={kind} endpoint={`${base}/${kind}`} onAdded={() => void load()} onCancel={() => setMode("list")} />
        )}

        {mode === "upload" && (
          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f && !busy) void upload(f);
              }}
              onClick={() => !busy && fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
                dragging ? "border-primary bg-primary/5" : "border-slate-300 hover:border-primary hover:bg-slate-50"
              } ${busy ? "pointer-events-none opacity-60" : ""}`}
            >
              <FileSpreadsheet size={28} className="text-primary" />
              <p className="text-sm font-semibold text-slate-800">
                {busy ? "Importing…" : `Drop your ${noun} spreadsheet here, or click to choose`}
              </p>
              <p className="text-xs text-slate-500">.xlsx or .csv, up to 2,000 rows. One row per {noun}, header row first.</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span>Need the format?</span>
              <a className="inline-flex items-center gap-1 font-semibold text-primary hover:underline" href={`${base}/template?kind=${kind}&format=xlsx`}>
                <Download size={14} /> Excel template
              </a>
              <a className="inline-flex items-center gap-1 font-semibold text-primary hover:underline" href={`${base}/template?kind=${kind}&format=csv`}>
                <Download size={14} /> CSV template
              </a>
            </div>

            {uploadError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {uploadError}
              </div>
            )}

            {job && (
              <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>
                    {processed} of {job.total} rows {job.remaining > 0 ? "processed…" : "done"}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="text-emerald-700">{job.created} created</span>
                  <span className="text-sky-700">{job.linked} linked to existing accounts</span>
                  {job.skipped > 0 && <span className="text-slate-600">{job.skipped} already here</span>}
                  <span className={job.failed ? "font-semibold text-red-700" : "text-slate-500"}>{job.failed} failed</span>
                </div>
              </div>
            )}

            {failedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Rows that need fixing</p>
                  {job && (
                    <a className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline" href={`${base}/import-jobs/${job.jobId}/report`}>
                      <Download size={14} /> Download report
                    </a>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Person</th>
                        <th className="px-3 py-2">Problem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {failedRows.map((r) => (
                        <tr key={r.rowNumber}>
                          <td className="px-3 py-2 font-mono text-slate-700">{r.rowNumber}</td>
                          <td className="px-3 py-2 text-slate-800">
                            {[r.raw?.first_name, r.raw?.last_name].filter(Boolean).join(" ") || "—"}
                          </td>
                          <td className="px-3 py-2 text-red-700">{r.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500">Fix these rows in your file and upload just those rows again. Rows already added are skipped.</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-9`}
              placeholder={`Search ${kind} by name, email or number`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="whitespace-nowrap text-xs text-slate-500">
            {visible.length} of {list.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">Number</th>
                <th className="px-3 py-2">Name</th>
                <th className="hidden px-3 py-2 sm:table-cell">Email</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                    {list.length === 0 ? `No ${kind} yet. Add one or upload a spreadsheet.` : "No match for that search."}
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const p = person(r);
                  const id = String(r.id ?? r._id);
                  return (
                    <tr key={id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-mono text-xs text-slate-900">{r.fileNumber ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-900">
                        {p.firstName} {p.lastName}
                        <span className="block text-xs text-slate-500 sm:hidden">{p.email}</span>
                      </td>
                      <td className="hidden px-3 py-2 text-slate-600 sm:table-cell">{p.email}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {r.status === "pending" && (
                            <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => void resend(id)}>
                              Resend invite
                            </button>
                          )}
                          {r.status === "active" && (
                            <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => void setStatus(id, "suspended")}>
                              Suspend
                            </button>
                          )}
                          {r.status === "suspended" && (
                            <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => void setStatus(id, "active")}>
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
