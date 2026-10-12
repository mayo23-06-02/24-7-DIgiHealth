"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge, { type BadgeStatus } from "@/components/ui/Badge";

export interface MedicalInvoiceRow {
  id: string;
  invoiceNumber: string;
  status: string;
  serviceDate: string;
  issuedAt: string;
  patientName: string;
  practitionerName: string;
  facilityName: string;
  medicalAidProvider?: string | null;
  medicalAidMemberNumber?: string | null;
  total: number;
  items: { tariffCode: string; icd10Code: string; description: string; quantity: number; amount: number }[];
  pdfUrl: string;
}

type Mode = "patient" | "practitioner" | "hospital";

const ENDPOINT: Record<Mode, string> = {
  patient: "/api/patient/invoices",
  practitioner: "/api/practitioner/invoices",
  hospital: "/api/hospital/invoices",
};

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  issued: "Issued",
  submitted: "Submitted",
  paid: "Paid",
  partially_paid: "Partially paid",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_BADGE: Record<string, BadgeStatus> = {
  issued: "info",
  submitted: "warning",
  paid: "success",
  partially_paid: "warning",
  rejected: "error",
  cancelled: "neutral",
};

/** Next statuses a doctor may record from the current one (mirrors canMoveStatus on the server). */
function nextStatuses(from: string): string[] {
  if (from === "cancelled") return [];
  return Object.keys(INVOICE_STATUS_LABEL).filter(
    (s) => s !== from && s !== "issued" && (s !== "cancelled" || from === "issued"),
  );
}

const zar = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 }).format(n || 0);
const day = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/** Download through fetch so an expired session shows an error instead of a blank tab. */
export async function downloadMedicalInvoice(pdfUrl: string, fallback = "invoice.pdf") {
  const res = await fetch(pdfUrl);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || "Could not download the invoice.");
  }
  const blob = await res.blob();
  const name = (res.headers.get("Content-Disposition") || "").match(/filename="?([^";]+)"?/i)?.[1] || fallback;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Medical-aid invoices list, shared by the patient, doctor and hospital billing pages.
 * Patients get Download; doctors also record the claim status; hospital admins read only.
 * On the patient page `?invoice=<id>` highlights that invoice and downloads it once.
 */
export default function MedicalInvoicesPanel({
  mode,
  refreshKey = 0,
  className = "",
}: {
  mode: Mode;
  refreshKey?: number;
  className?: string;
}) {
  const [rows, setRows] = useState<MedicalInvoiceRow[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const autoDownloaded = useRef(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(ENDPOINT[mode]);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Could not load invoices.");
      setRows(j.data ?? []);
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
    }
  }, [mode]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const download = useCallback(async (inv: MedicalInvoiceRow) => {
    setBusy(inv.id);
    setError("");
    try {
      await downloadMedicalInvoice(inv.pdfUrl, `${inv.invoiceNumber}.pdf`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  // Deep link from the notification or email: highlight and download once.
  useEffect(() => {
    if (!rows || autoDownloaded.current || typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("invoice");
    if (!id) return;
    const inv = rows.find((r) => r.id === id);
    autoDownloaded.current = true;
    if (!inv) {
      setError("That invoice is not available on this account.");
      return;
    }
    setHighlight(id);
    document.getElementById(`invoice-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (mode === "patient") download(inv);
  }, [rows, mode, download]);

  async function setStatus(inv: MedicalInvoiceRow, status: string) {
    setBusy(inv.id);
    setError("");
    try {
      const res = await fetch(`/api/practitioner/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Could not update the status.");
      setRows((rs) => (rs ?? []).map((r) => (r.id === inv.id ? { ...r, status: j.data.status } : r)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const title = mode === "practitioner" ? "Invoices issued" : "Medical aid invoices";
  const subtitle =
    mode === "patient"
      ? "Invoices from your doctors. Download them to submit to your medical aid."
      : mode === "practitioner"
        ? "Medical aid invoices you issued. Record the claim status as it changes."
        : "Medical aid invoices issued by doctors at your hospital.";

  return (
    <Card className={className}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-h4 font-bold text-ink-900 font-grotesk">
            <FileText size={20} className="text-primary" /> {title}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={load}
          aria-label="Refresh invoices"
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {rows === null ? (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={16} /> Loading invoices…
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          {mode === "patient" ? "No medical aid invoices yet." : "No invoices issued yet."}
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold text-slate-500">
                <th className="px-4 py-2">Invoice</th>
                <th className="px-4 py-2">{mode === "patient" ? "Doctor" : "Patient"}</th>
                {mode === "hospital" && <th className="px-4 py-2">Doctor</th>}
                <th className="px-4 py-2">Service date</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr
                  key={inv.id}
                  id={`invoice-${inv.id}`}
                  className={`border-b border-slate-50 align-top ${highlight === inv.id ? "bg-primary/5" : ""}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-bold text-slate-800">{inv.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">{inv.facilityName}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {inv.items.map((i) => i.tariffCode).join(", ")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">
                      {mode === "patient" ? inv.practitionerName : inv.patientName}
                    </p>
                    {mode === "patient" && (
                      <p className="text-xs text-slate-500">For {inv.patientName}</p>
                    )}
                    {mode !== "patient" && inv.medicalAidProvider && (
                      <p className="text-xs text-slate-500">
                        {inv.medicalAidProvider}
                        {inv.medicalAidMemberNumber ? ` · ${inv.medicalAidMemberNumber}` : ""}
                      </p>
                    )}
                  </td>
                  {mode === "hospital" && <td className="px-4 py-3 text-slate-700">{inv.practitionerName}</td>}
                  <td className="px-4 py-3 text-slate-700">{day(inv.serviceDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{zar(inv.total)}</td>
                  <td className="px-4 py-3">
                    {mode === "practitioner" && nextStatuses(inv.status).length > 0 ? (
                      <select
                        aria-label={`Status of ${inv.invoiceNumber}`}
                        value={inv.status}
                        disabled={busy === inv.id}
                        onChange={(e) => setStatus(inv, e.target.value)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        <option value={inv.status}>{INVOICE_STATUS_LABEL[inv.status] ?? inv.status}</option>
                        {nextStatuses(inv.status).map((s) => (
                          <option key={s} value={s}>
                            {INVOICE_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge label={INVOICE_STATUS_LABEL[inv.status] ?? inv.status} status={STATUS_BADGE[inv.status] ?? "neutral"} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => download(inv)}
                      disabled={busy === inv.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 disabled:opacity-50"
                    >
                      {busy === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
