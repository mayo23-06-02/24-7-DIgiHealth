"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { ImportKind } from "@/lib/provisioning/columns";
import { COLUMNS } from "@/lib/provisioning/columns";
import { dobFromSaId, genderFromSaId } from "@/lib/provisioning/saId";
import { ChipInput, Field, Section, Segmented, ghostBtn, inputClass, primaryBtn, splitFieldErrors } from "./formKit";

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LIST_KEYS = ["allergies", "chronic_conditions", "current_medications", "qualifications", "languages"];
const MOBILE_RE = /^(\+?27|0)[6-8]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Value = string | string[];
type State = Record<string, Value>;

const initial = (kind: ImportKind): State =>
  kind === "patients"
    ? { gender: "", allergies: [], chronic_conditions: [], current_medications: [] }
    : { role: "doctor", qualifications: [], languages: ["English"], shift_start: "08:00", shift_end: "16:00", shift_days: ["Mon", "Tue", "Wed", "Thu", "Fri"] };

/** Client checks mirroring validPatientRow / validDoctorRow, so most mistakes show before saving. */
function validate(kind: ImportKind, s: State): Record<string, string> {
  const e: Record<string, string> = {};
  const v = (k: string) => String(s[k] ?? "").trim();
  for (const c of COLUMNS[kind]) {
    if (c.required && !LIST_KEYS.includes(c.key) && !v(c.key)) e[c.key] = "Required.";
  }
  if (v("email") && !EMAIL_RE.test(v("email"))) e.email = "Enter a valid email address.";
  if (v("mobile") && !MOBILE_RE.test(v("mobile").replace(/[\s-]/g, ""))) e.mobile = "Enter a South African mobile number (+27).";
  if (kind === "patients") {
    if (v("id_number") && !/^\d{13}$/.test(v("id_number"))) e.id_number = "Must be 13 digits.";
    else if (v("id_number") && !dobFromSaId(v("id_number"))) e.id_number = "This ID number doesn't contain a valid date of birth.";
    const idDob = dobFromSaId(v("id_number"));
    if (idDob && v("date_of_birth") && idDob.toISOString().slice(0, 10) !== v("date_of_birth")) e.date_of_birth = "Doesn't match the ID number.";
    if (v("emergency_contact_phone") && !MOBILE_RE.test(v("emergency_contact_phone").replace(/[\s-]/g, ""))) {
      e.emergency_contact_phone = "Enter a South African mobile number (+27).";
    }
  } else {
    if (v("years_experience") && !/^\d{1,2}$/.test(v("years_experience"))) e.years_experience = "Whole number.";
    if (Array.isArray(s.shift_days) && s.shift_days.length === 0) e.shift_days = "Pick at least one day.";
  }
  return e;
}

/**
 * Add one patient or doctor at a hospital. Fields use the standard import names, so the
 * server applies exactly the same rules as a spreadsheet row.
 */
export default function AddPersonForm({
  kind,
  endpoint,
  onAdded,
  onCancel,
}: {
  kind: ImportKind;
  endpoint: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [s, setS] = useState<State>(initial(kind));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; email: string; linked: boolean } | null>(null);

  const str = (k: string) => String(s[k] ?? "");
  const list = (k: string) => (Array.isArray(s[k]) ? (s[k] as string[]) : []);
  const set = (k: string, val: Value) => {
    setS((p) => ({ ...p, [k]: val }));
    setErrors((e) => {
      const n = { ...e };
      delete n[k];
      return n;
    });
  };

  // An SA ID carries the date of birth and gender; fill them in when they're still empty.
  const onIdNumber = (raw: string) => {
    const id = raw.replace(/\D/g, "").slice(0, 13);
    set("id_number", id);
    const dob = dobFromSaId(id);
    if (dob && !str("date_of_birth")) set("date_of_birth", dob.toISOString().slice(0, 10));
    const g = genderFromSaId(id);
    if (g && !str("gender")) set("gender", g);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErrors = validate(kind, s);
    setErrors(clientErrors);
    setGeneral([]);
    if (Object.keys(clientErrors).length) return;

    setBusy(true);
    try {
      const body: Record<string, string> = {};
      for (const [k, v] of Object.entries(s)) body[k] = Array.isArray(v) ? v.join(";") : v;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const { byField, general: rest } = splitFieldErrors(
          json.errors ?? [json.error ?? "Could not save"],
          COLUMNS[kind].map((c) => c.key),
        );
        setErrors(byField);
        setGeneral(rest);
        return;
      }
      setDone({
        name: `${str("first_name")} ${str("last_name")}`.trim(),
        email: str("email").replace(/^(.).*(@.*)$/, "$1***$2"),
        linked: json.data?.status === "linked",
      });
      onAdded();
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
        <p className="flex items-center gap-2 font-bold">
          <CheckCircle2 size={18} /> {done.name} added
        </p>
        <p className="mt-1">
          {done.linked
            ? "They already had an account, so this hospital was linked to it."
            : `An invite to complete their health profile was sent to ${done.email}.`}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className={primaryBtn}
            onClick={() => {
              setS(initial(kind));
              setDone(null);
            }}
          >
            Add another
          </button>
          <button type="button" className={ghostBtn} onClick={onCancel}>
            Done
          </button>
        </div>
      </div>
    );
  }

  const text = (k: string, label: string, opts: { required?: boolean; placeholder?: string; type?: string; full?: boolean; hint?: string; inputMode?: "numeric" | "tel" | "email" } = {}) => (
    <Field label={label} required={opts.required} error={errors[k]} full={opts.full} hint={opts.hint}>
      <input
        className={inputClass}
        type={opts.type ?? "text"}
        inputMode={opts.inputMode}
        value={str(k)}
        placeholder={opts.placeholder}
        onChange={(e) => set(k, e.target.value)}
      />
    </Field>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-6 rounded-lg border border-slate-200 p-4">
      {general.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {general.join(" ")}
        </div>
      )}

      {kind === "patients" ? (
        <>
          <Section title="Hospital file">
            {text("file_number", "File number", { required: true, placeholder: "e.g. MP-004211", hint: "The hospital's own number. Unique at this hospital." })}
          </Section>
          <Section title="Personal details">
            {text("first_name", "First name", { required: true, placeholder: "e.g. Thandiwe" })}
            {text("last_name", "Last name", { required: true, placeholder: "e.g. Mokoena" })}
            <Field label="SA ID number" required error={errors.id_number} hint="Fills in date of birth and gender.">
              <input className={inputClass} inputMode="numeric" maxLength={13} value={str("id_number")} placeholder="13 digits" onChange={(e) => onIdNumber(e.target.value)} />
            </Field>
            {text("date_of_birth", "Date of birth", { required: true, type: "date" })}
            <Field label="Gender" required error={errors.gender}>
              <div>
                <Segmented
                  value={str("gender")}
                  onChange={(v) => set("gender", v)}
                  options={[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>
            </Field>
          </Section>
          <Section title="Contact" hint="The invite to complete their health profile is sent to this email.">
            {text("email", "Email", { required: true, type: "email", inputMode: "email", placeholder: "name@example.com" })}
            {text("mobile", "Mobile", { required: true, type: "tel", inputMode: "tel", placeholder: "082 123 4567" })}
          </Section>
          <Section title="Medical aid" hint="Optional.">
            {text("medical_aid_provider", "Provider", { placeholder: "e.g. Discovery Health" })}
            {text("medical_aid_plan", "Plan", { placeholder: "e.g. Classic Saver" })}
            {text("medical_aid_member_number", "Member number", { full: true })}
          </Section>
          <Section title="Emergency contact" hint="Optional.">
            {text("emergency_contact_name", "Name")}
            {text("emergency_contact_phone", "Phone", { type: "tel", inputMode: "tel" })}
            {text("emergency_contact_relationship", "Relationship", { placeholder: "e.g. Mother" })}
          </Section>
          <Section title="Clinical" hint="Optional. The patient can add to this when they complete their profile.">
            <Field label="Blood type" error={errors.blood_type}>
              <select className={inputClass} value={str("blood_type")} onChange={(e) => set("blood_type", e.target.value)}>
                <option value="">Unknown</option>
                {BLOOD.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            {text("referring_doctor", "Referring doctor", { placeholder: "e.g. Dr A Naidoo" })}
            <Field label="Allergies" full>
              <ChipInput value={list("allergies")} onChange={(v) => set("allergies", v)} placeholder="Type and press Enter" suggestions={["Penicillin", "Latex", "Peanuts", "Sulfa drugs"]} />
            </Field>
            <Field label="Chronic conditions" full>
              <ChipInput value={list("chronic_conditions")} onChange={(v) => set("chronic_conditions", v)} placeholder="Type and press Enter" suggestions={["Hypertension", "Type 2 diabetes", "Asthma", "HIV"]} />
            </Field>
            <Field label="Current medications" full>
              <ChipInput value={list("current_medications")} onChange={(v) => set("current_medications", v)} placeholder="Type and press Enter" />
            </Field>
            <Field label="Notes" full hint="For the hospital's own record.">
              <textarea className={inputClass} rows={2} value={str("notes")} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </Section>
        </>
      ) : (
        <>
          <Section title="Hospital staff record">
            {text("staff_number", "Staff number", { required: true, placeholder: "e.g. DR-0457", hint: "The hospital's own number. Unique at this hospital." })}
            <Field label="Role" required>
              <select className={inputClass} value={str("role")} onChange={(e) => set("role", e.target.value)}>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="technician">Technician</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            {text("department", "Department", { placeholder: "e.g. Emergency" })}
          </Section>
          <Section title="Personal details">
            {text("first_name", "First name", { required: true, placeholder: "e.g. Sipho" })}
            {text("last_name", "Last name", { required: true, placeholder: "e.g. Khumalo" })}
          </Section>
          <Section title="Contact" hint="The invite to complete their profile is sent to this email.">
            {text("email", "Email", { required: true, type: "email", inputMode: "email", placeholder: "name@hospital.co.za" })}
            {text("mobile", "Mobile", { required: true, type: "tel", inputMode: "tel", placeholder: "071 123 4567" })}
          </Section>
          <Section title="Professional">
            {text("hpcsa_number", "HPCSA number", { required: true, placeholder: "e.g. MP0123456" })}
            {text("specialisation", "Specialisation", { required: true, placeholder: "e.g. General Practitioner" })}
            {text("years_experience", "Years of experience", { type: "number", inputMode: "numeric", placeholder: "e.g. 8" })}
            <Field label="Qualifications" full>
              <ChipInput value={list("qualifications")} onChange={(v) => set("qualifications", v)} placeholder="Type and press Enter" suggestions={["MBChB", "FCP(SA)", "DipPEC", "BCur"]} />
            </Field>
            <Field label="Languages" full>
              <ChipInput value={list("languages")} onChange={(v) => set("languages", v)} placeholder="Type and press Enter" suggestions={["English", "isiZulu", "isiXhosa", "Afrikaans", "Sesotho", "Setswana", "siSwati"]} />
            </Field>
          </Section>
          <Section title="Shift">
            {text("shift_start", "Starts", { type: "time" })}
            {text("shift_end", "Ends", { type: "time" })}
            <Field label="Days" full error={errors.shift_days}>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => {
                  const on = list("shift_days").includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("shift_days", on ? list("shift_days").filter((x) => x !== d) : DAYS.filter((x) => x === d || list("shift_days").includes(x)))}
                      className={`h-9 w-12 rounded-lg border text-xs font-semibold ${on ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-600 hover:border-primary"}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>
        </>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className={ghostBtn} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={primaryBtn} disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          {busy ? "Saving…" : kind === "patients" ? "Add patient and send invite" : "Add doctor and send invite"}
        </button>
      </div>
    </form>
  );
}
