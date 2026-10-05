"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { COLUMNS, type ImportKind } from "@/lib/provisioning/columns";

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
}

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900";
const btn = "rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-50";
const solid = "rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50";

/**
 * Platform-admin tool for one hospital: list the people it has issued numbers to, add one
 * person, or upload a spreadsheet. Spreadsheet rows are processed in batches until none remain.
 */
export default function FacilityRosterPanel({ facilityId, facilityName, onClose }: Props) {
  const [kind, setKind] = useState<ImportKind>("patients");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const base = `/api/admin/facilities/${facilityId}`;

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
    setJob(null);
    setShowForm(false);
    setErrors([]);
  }, [load]);

  const addOne = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch(`${base}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors(json.errors ?? [json.error ?? "Failed"]);
        return;
      }
      toast.success(json.data.status === "linked" ? "Linked existing account" : "Added. Set-password email sent.");
      setForm({});
      setShowForm(false);
      void load();
    } finally {
      setBusy(false);
    }
  };

  const runJob = async (jobId: string, start: JobState) => {
    let state = start;
    while (state.remaining > 0) {
      const res = await fetch(`${base}/import-jobs/${jobId}/process`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Processing failed");
      const d = json.data;
      state = {
        ...state,
        remaining: d.remaining,
        created: d.created ?? state.created,
        linked: d.linked ?? state.linked,
        failed: d.failed ?? state.failed,
      };
      setJob(state);
      if (d.processed === 0) break;
    }
    toast.success("Import finished");
    void load();
  };

  const upload = async (file: File) => {
    setBusy(true);
    setErrors([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${base}/${kind}/import`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setErrors([json.error ?? "Upload failed"]);
        return;
      }
      const d = json.data;
      const start: JobState = {
        jobId: d.jobId,
        total: d.total,
        failed: d.failed,
        remaining: d.pending,
        created: 0,
        linked: 0,
      };
      setJob(start);
      await runJob(d.jobId, start);
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const resend = async (id: string) => {
    const path = kind === "patients" ? `patients/${id}/resend` : `doctors/${id}/resend`;
    const res = await fetch(`${base}/${path}`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    res.ok ? toast.success("Email sent") : toast.error(json.error ?? "Failed");
  };

  const setStatus = async (id: string, status: string) => {
    const path = kind === "patients" ? `patients/${id}` : `doctors/${id}`;
    const res = await fetch(`${base}/${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) void load();
    else toast.error(json.error ?? "Failed");
  };

  const person = (r: any) => r.patientId ?? r.userId ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-4xl rounded-lg bg-white p-5 md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{facilityName}</h3>
            <p className="text-xs text-slate-500">People this hospital has issued file numbers to</p>
          </div>
          <button className={btn} onClick={onClose}>Close</button>
        </div>

        <div className="mb-4 flex gap-2">
          {(["patients", "doctors"] as ImportKind[]).map((k) => (
            <button key={k} className={k === kind ? solid : btn} onClick={() => setKind(k)}>
              {k === "patients" ? "Patients" : "Doctors"}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button className={solid} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Hide form" : `Add one ${kind === "patients" ? "patient" : "doctor"}`}
          </button>
          <button className={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
            Upload spreadsheet
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
          />
          <a className={btn} href={`${base}/template?kind=${kind}&format=xlsx`}>Template (.xlsx)</a>
          <a className={btn} href={`${base}/template?kind=${kind}&format=csv`}>Template (.csv)</a>
        </div>

        {errors.length > 0 && (
          <ul role="alert" className="mb-4 list-disc rounded-lg border border-red-200 bg-red-50 p-3 pl-7 text-sm text-red-700">
            {errors.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        )}

        {job && (
          <div className="mb-4 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
            <p>
              {job.total - job.failed - job.remaining} of {job.total} rows processed
              {job.remaining > 0 ? "…" : "."} Created {job.created}, linked {job.linked}, failed {job.failed}.
            </p>
            {job.remaining === 0 && job.failed > 0 && (
              <a className="font-bold text-primary underline" href={`${base}/import-jobs/${job.jobId}/report`}>
                Download error report
              </a>
            )}
          </div>
        )}

        {showForm && (
          <form onSubmit={addOne} className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-2">
            {COLUMNS[kind].map((c) => (
              <label key={c.key} className="text-xs font-medium text-slate-700">
                {c.key}{c.required ? " *" : ""}
                <input
                  className={input}
                  placeholder={c.example}
                  title={c.description}
                  required={c.required}
                  value={form[c.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                />
              </label>
            ))}
            <div className="md:col-span-2">
              <button className={solid} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-3">Number</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-6 text-center text-slate-500">Loading…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-slate-500">Nobody yet.</td></tr>
              ) : (
                list.map((r) => {
                  const p = person(r);
                  const id = String(r.id ?? r._id);
                  return (
                    <tr key={id}>
                      <td className="py-2 pr-3 font-mono text-xs text-slate-900">{r.fileNumber}</td>
                      <td className="py-2 pr-3 text-slate-900">{p.firstName} {p.lastName}</td>
                      <td className="py-2 pr-3 text-slate-600">{p.email}</td>
                      <td className="py-2 pr-3 text-slate-700">{r.status}</td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {r.status === "pending" && (
                            <button className={btn} onClick={() => void resend(id)}>Resend email</button>
                          )}
                          {r.status === "active" && (
                            <button className={btn} onClick={() => void setStatus(id, "suspended")}>Suspend</button>
                          )}
                          {r.status === "suspended" && (
                            <button className={btn} onClick={() => void setStatus(id, "active")}>Reactivate</button>
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
    </div>
  );
}
