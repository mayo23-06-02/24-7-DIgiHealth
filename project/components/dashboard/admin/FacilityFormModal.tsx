"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { SA_PROVINCES } from "@/lib/geo/provinces";
import {
  ChipInput,
  Field,
  Modal,
  Section,
  Segmented,
  Toggle,
  ghostBtn,
  inputClass,
  primaryBtn,
} from "./formKit";

interface Props {
  /** Facility id to edit, or null to create. */
  facilityId: string | null;
  canRename: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type FacilityType = "Private" | "Public" | "NGO";

const SPECIALTY_SUGGESTIONS = [
  "General Medicine",
  "Emergency",
  "Paediatrics",
  "Maternity",
  "Cardiology",
  "Orthopaedics",
  "Radiology",
  "Oncology",
  "Psychiatry",
  "Surgery",
];

const EMPTY = {
  name: "",
  facilityType: "Private" as FacilityType,
  street: "",
  city: "",
  province: "",
  phone: "",
  emergencyPhone: "",
  email: "",
  specialties: [] as string[],
  fileNumberPrefix: "",
  emergencyServices: false,
  isOpen: true,
};
type FormState = typeof EMPTY;

/** Client checks that mirror lib/facility/input.ts, so most mistakes show before saving. */
function validate(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = "Enter the facility name.";
  if (!f.city.trim()) e.city = "Enter the city.";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email address.";
  if (f.fileNumberPrefix && !/^[A-Za-z0-9-]+$/.test(f.fileNumberPrefix)) e.fileNumberPrefix = "Letters, numbers and dashes only.";
  return e;
}

/** Create or edit a facility (platform admins). */
export default function FacilityFormModal({ facilityId, canRename, onClose, onSaved }: Props) {
  const [f, setF] = useState<FormState>({ ...EMPTY });
  const [loading, setLoading] = useState(!!facilityId);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string[]>([]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => {
      const n = { ...e };
      delete n[k as string];
      return n;
    });
  };

  useEffect(() => {
    if (!facilityId) return;
    fetch(`/api/admin/facilities/${facilityId}`)
      .then((r) => r.json())
      .then((j) => {
        const x = j?.data?.facility;
        if (!x) throw new Error(j?.error || "Could not load facility");
        setF({
          name: x.name ?? "",
          facilityType: (x.facilityType as FacilityType) ?? "Private",
          street: x.address?.street ?? "",
          city: x.address?.city ?? "",
          province: x.address?.province ?? "",
          phone: x.contactInfo?.phone ?? "",
          emergencyPhone: x.contactInfo?.emergencyPhone ?? "",
          email: x.contactInfo?.email ?? "",
          specialties: x.specialties ?? [],
          fileNumberPrefix: x.fileNumberPrefix ?? "",
          emergencyServices: !!x.emergencyServices,
          isOpen: x.isOpen !== false,
        });
      })
      .catch((e) => {
        toast.error(e.message);
        onClose();
      })
      .finally(() => setLoading(false));
    // Load once per facility; onClose is a fresh closure on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const clientErrors = validate(f);
    setErrors(clientErrors);
    setGeneral([]);
    if (Object.keys(clientErrors).length) return;

    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        facilityType: f.facilityType,
        address: { street: f.street, city: f.city, province: f.province },
        contactInfo: { phone: f.phone, emergencyPhone: f.emergencyPhone, email: f.email },
        specialties: f.specialties,
        fileNumberPrefix: f.fileNumberPrefix,
        emergencyServices: f.emergencyServices,
        isOpen: f.isOpen,
      };
      if (!facilityId || canRename) body.name = f.name;
      const res = await fetch(facilityId ? `/api/admin/facilities/${facilityId}` : "/api/admin/facilities", {
        method: facilityId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const list: string[] = json.errors ?? [json.error ?? "Could not save"];
        const byField: Record<string, string> = {};
        const rest: string[] = [];
        for (const m of list) {
          if (/name/i.test(m)) byField.name = m;
          else if (/city/i.test(m)) byField.city = m;
          else if (/email/i.test(m)) byField.email = m;
          else if (/prefix/i.test(m)) byField.fileNumberPrefix = m;
          else rest.push(m);
        }
        setErrors(byField);
        setGeneral(rest);
        return;
      }
      toast.success(facilityId ? "Facility updated" : `${f.name} created`);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const nameLocked = !!facilityId && !canRename;

  return (
    <Modal
      title={facilityId ? "Edit facility" : "Add new facility"}
      subtitle={facilityId ? f.name : "Add a hospital or clinic so you can load its patients and doctors."}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={ghostBtn}>
            Cancel
          </button>
          <button type="button" onClick={() => void save()} disabled={busy || loading} className={primaryBtn}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? "Saving…" : facilityId ? "Save changes" : "Create facility"}
          </button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <form onSubmit={save} className="space-y-6" noValidate>
          {general.length > 0 && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {general.join(" ")}
            </div>
          )}

          <Section title="Facility details">
            <Field label="Name" required full error={errors.name} hint={nameLocked ? "Only a mega admin can rename a facility." : undefined}>
              <input
                className={inputClass}
                value={f.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Netcare Milpark Hospital"
                disabled={nameLocked}
                autoFocus={!facilityId}
              />
            </Field>
            <Field label="Type" required>
              <div>
                <Segmented<FacilityType>
                  value={f.facilityType}
                  onChange={(v) => set("facilityType", v)}
                  options={[
                    { value: "Private", label: "Private" },
                    { value: "Public", label: "Public" },
                    { value: "NGO", label: "NGO" },
                  ]}
                />
              </div>
            </Field>
            <Field label="File number prefix" error={errors.fileNumberPrefix} hint="Optional. Shown before generated file numbers, e.g. MP-000123.">
              <input
                className={inputClass}
                value={f.fileNumberPrefix}
                onChange={(e) => set("fileNumberPrefix", e.target.value.toUpperCase())}
                placeholder="e.g. MP"
                maxLength={12}
              />
            </Field>
          </Section>

          <Section title="Location">
            <Field label="Street address" full>
              <input className={inputClass} value={f.street} onChange={(e) => set("street", e.target.value)} placeholder="e.g. 9 Guild Road, Parktown West" />
            </Field>
            <Field label="City" required error={errors.city}>
              <input className={inputClass} value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Johannesburg" />
            </Field>
            <Field label="Province">
              <select className={inputClass} value={f.province} onChange={(e) => set("province", e.target.value)}>
                <option value="">Select province</option>
                {SA_PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
                {f.province && !(SA_PROVINCES as readonly string[]).includes(f.province) && <option>{f.province}</option>}
              </select>
            </Field>
          </Section>

          <Section title="Contact">
            <Field label="Phone">
              <input type="tel" className={inputClass} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="e.g. 011 480 5600" />
            </Field>
            <Field label="Emergency phone">
              <input type="tel" className={inputClass} value={f.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} placeholder="24-hour line" />
            </Field>
            <Field label="Email" full error={errors.email}>
              <input type="email" className={inputClass} value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="reception@hospital.co.za" />
            </Field>
          </Section>

          <Section title="Services">
            <Field label="Specialties" full hint="Type and press Enter, or pick a suggestion.">
              <ChipInput value={f.specialties} onChange={(v) => set("specialties", v)} placeholder="e.g. Cardiology" suggestions={SPECIALTY_SUGGESTIONS} />
            </Field>
            <Toggle checked={f.emergencyServices} onChange={(v) => set("emergencyServices", v)} label="Emergency services" hint="Has a 24-hour emergency unit." />
            <Toggle checked={f.isOpen} onChange={(v) => set("isOpen", v)} label="Open" hint="Closed facilities stay listed but can't take new bookings." />
          </Section>
          <button type="submit" className="hidden" aria-hidden />
        </form>
      )}
    </Modal>
  );
}
