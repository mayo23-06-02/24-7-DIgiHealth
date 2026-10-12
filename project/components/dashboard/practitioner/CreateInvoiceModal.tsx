"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import {
  Field,
  Modal,
  Section,
  ghostBtn,
  inputClass,
  primaryBtn,
} from "@/components/dashboard/admin/formKit";
import { downloadMedicalInvoice } from "@/components/billing/MedicalInvoicesPanel";

interface BillingFacility {
  id: string;
  name: string;
  address: string;
  medicalAid: { provider: string; planName: string; memberNumber: string };
}

interface Line {
  tariffCode: string;
  icd10Code: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

const emptyLine = (): Line => ({
  tariffCode: "",
  icd10Code: "",
  description: "",
  quantity: "1",
  unitPrice: "",
});

const zar = (n: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(n || 0);

const today = () => new Date().toISOString().slice(0, 10);

/** Hospitals where this doctor may bill the patient. Empty means billing is off everywhere they share. */
export function useBillingFacilities(patientId?: string) {
  const [facilities, setFacilities] = useState<BillingFacility[] | null>(null);
  useEffect(() => {
    if (!patientId) return;
    let live = true;
    fetch(
      `/api/practitioner/invoices/options?patientId=${encodeURIComponent(patientId)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && setFacilities(j?.data?.facilities ?? []))
      .catch(() => live && setFacilities([]));
    return () => {
      live = false;
    };
  }, [patientId]);
  return facilities;
}

/** "Create invoice" button that only renders when medical-aid billing is available for this patient. */
export function CreateInvoiceButton({
  patientId,
  patientName,
  consultationId,
  serviceDate,
  className,
  onCreated,
}: {
  patientId: string;
  patientName: string;
  consultationId?: string;
  serviceDate?: string;
  className?: string;
  onCreated?: () => void;
}) {
  const facilities = useBillingFacilities(patientId);
  const [open, setOpen] = useState(false);
  if (!facilities?.length) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? ghostBtn}
      >
        <Receipt size={16} className="shrink-0" />{" "}
        <span className="whitespace-nowrap">Create invoice</span>
      </button>
      {open &&
        createPortal(
          <CreateInvoiceModal
            patientId={patientId}
            patientName={patientName}
            consultationId={consultationId}
            serviceDate={serviceDate}
            facilities={facilities}
            onClose={() => setOpen(false)}
            onCreated={onCreated}
          />,
          document.body,
        )}
    </>
  );
}

/**
 * Medical-aid invoice form: hospital, service date, tariff + ICD-10 lines and notes.
 * The server recomputes every amount; the total here is only a preview.
 */
export default function CreateInvoiceModal({
  patientId,
  patientName,
  consultationId,
  serviceDate: initialDate,
  facilities,
  onClose,
  onCreated,
}: {
  patientId: string;
  patientName: string;
  consultationId?: string;
  serviceDate?: string;
  facilities: BillingFacility[];
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [serviceDate, setServiceDate] = useState(() => {
    const d = (initialDate || "").slice(0, 10);
    return d && d <= today() ? d : today();
  });
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [dependantCode, setDependantCode] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{
    invoiceNumber: string;
    pdfUrl: string;
    total: number;
  } | null>(null);

  const facility = facilities.find((f) => f.id === facilityId);
  const aid = facility?.medicalAid;
  const total = useMemo(
    () =>
      lines.reduce(
        (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
        0,
      ),
    [lines],
  );

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function submit() {
    setError("");
    const bad = lines.findIndex(
      (l) =>
        !l.tariffCode.trim() ||
        !l.icd10Code.trim() ||
        !l.description.trim() ||
        l.unitPrice === "",
    );
    if (bad >= 0) {
      setError(
        `Line ${bad + 1}: fill in the tariff code, ICD-10 code, description and price.`,
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/practitioner/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          facilityId,
          consultationId,
          serviceDate,
          dependantCode: dependantCode.trim() || undefined,
          notes: notes.trim() || undefined,
          items: lines.map((l) => ({
            tariffCode: l.tariffCode,
            icd10Code: l.icd10Code,
            description: l.description,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          })),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Could not create the invoice.");
      setCreated({
        invoiceNumber: j.data.invoiceNumber,
        pdfUrl: j.data.pdfUrl,
        total: j.data.total,
      });
      onCreated?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <Modal
        title="Invoice issued"
        onClose={onClose}
        footer={
          <>
            <button
              type="button"
              className={ghostBtn}
              onClick={() =>
                downloadMedicalInvoice(
                  created.pdfUrl,
                  `${created.invoiceNumber}.pdf`,
                ).catch((e) => setError(e.message))
              }
            >
              Download PDF
            </button>
            <button type="button" className={primaryBtn} onClick={onClose}>
              Done
            </button>
          </>
        }
      >
        <div
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-bold">
              {created.invoiceNumber} · {zar(created.total)}
            </p>
            <p className="mt-1">
              {patientName} has been notified and can download it from their
              Billing page. Record the claim status under Billing → Invoices
              issued.
            </p>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Modal>
    );
  }

  return (
    <Modal
      wide
      title="Create medical aid invoice"
      subtitle={`For ${patientName}`}
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto self-center text-sm font-bold text-slate-800">
            Total {zar(total)}
          </span>
          <button
            type="button"
            className={ghostBtn}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={primaryBtn}
            onClick={submit}
            disabled={busy || !facilityId}
          >
            {busy ? "Issuing…" : "Issue invoice"}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <Section title="Visit">
          <Field label="Hospital" required>
            <select
              className={inputClass}
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Service date" required>
            <input
              type="date"
              className={inputClass}
              value={serviceDate}
              max={today()}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </Field>
        </Section>

        <Section
          title="Medical aid on file"
          hint="Copied onto the invoice when you issue it."
        >
          {aid?.provider ? (
            <div className="sm:col-span-2 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-3">
              <p>
                <span className="block text-[11px] text-slate-500">Scheme</span>
                <span className="font-semibold text-slate-800">
                  {aid.provider}
                </span>
              </p>
              <p>
                <span className="block text-[11px] text-slate-500">Plan</span>
                <span className="font-semibold text-slate-800">
                  {aid.planName || "—"}
                </span>
              </p>
              <p>
                <span className="block text-[11px] text-slate-500">
                  Member no.
                </span>
                <span className="font-semibold text-slate-800">
                  {aid.memberNumber || "—"}
                </span>
              </p>
            </div>
          ) : (
            <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              No medical aid on file for this patient. The invoice will be
              issued without scheme details, for the patient to settle directly.
            </div>
          )}
          <Field label="Dependant code" hint="e.g. 00 for the main member">
            <input
              className={inputClass}
              value={dependantCode}
              maxLength={10}
              onChange={(e) => setDependantCode(e.target.value)}
            />
          </Field>
        </Section>

        <fieldset className="space-y-3 border-t border-slate-100 pt-5">
          <legend className="text-sm font-bold text-slate-900">
            Line items
          </legend>
          <p className="-mt-1 text-xs text-slate-500">
            Tariff code (e.g. 0190), ICD-10 code (e.g. J06.9, separate several
            with commas), description, quantity and unit price.
          </p>
          {lines.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-12"
            >
              <input
                aria-label={`Line ${i + 1} tariff code`}
                placeholder="Tariff"
                className={`${inputClass} sm:col-span-2`}
                value={l.tariffCode}
                onChange={(e) =>
                  setLine(i, { tariffCode: e.target.value.toUpperCase() })
                }
              />
              <input
                aria-label={`Line ${i + 1} ICD-10 code`}
                placeholder="ICD-10"
                className={`${inputClass} sm:col-span-2`}
                value={l.icd10Code}
                onChange={(e) =>
                  setLine(i, { icd10Code: e.target.value.toUpperCase() })
                }
              />
              <input
                aria-label={`Line ${i + 1} description`}
                placeholder="Description"
                className={`${inputClass} col-span-2 sm:col-span-4`}
                value={l.description}
                onChange={(e) => setLine(i, { description: e.target.value })}
              />
              <input
                aria-label={`Line ${i + 1} quantity`}
                type="number"
                min={1}
                step={1}
                placeholder="Qty"
                className={`${inputClass} sm:col-span-1`}
                value={l.quantity}
                onChange={(e) => setLine(i, { quantity: e.target.value })}
              />
              <input
                aria-label={`Line ${i + 1} unit price`}
                type="number"
                min={0}
                step="0.01"
                placeholder="Unit R"
                className={`${inputClass} sm:col-span-2`}
                value={l.unitPrice}
                onChange={(e) => setLine(i, { unitPrice: e.target.value })}
              />
              <button
                type="button"
                aria-label={`Remove line ${i + 1}`}
                disabled={lines.length === 1}
                onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                className="flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 sm:col-span-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className={ghostBtn}
            onClick={() => setLines((ls) => [...ls, emptyLine()])}
            disabled={lines.length >= 50}
          >
            <Plus size={16} /> Add line
          </button>
        </fieldset>

        <Section title="Notes">
          <Field label="Notes for the patient" full>
            <textarea
              className={inputClass}
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </Section>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
