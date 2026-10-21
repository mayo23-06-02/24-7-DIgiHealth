"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  FileText,
  HeartPulse,
  Loader2,
  Receipt,
  Video,
} from "lucide-react";
import LogoMain from "@/components/ui/LogoMain";
import { SA_PROVINCES } from "@/lib/geo/provinces";
import {
  PRACTICE_NEXT_STEPS,
  PRACTICE_SIZES,
  PRACTICE_SPECIALITIES,
} from "@/lib/leads/practiceEnquiry";

type Form = {
  fullName: string;
  practiceName: string;
  speciality: string;
  province: string;
  email: string;
  phone: string;
  practiceSize: string;
  nextStep: string;
  consent: boolean;
  website: string;
};

const EMPTY: Form = {
  fullName: "",
  practiceName: "",
  speciality: PRACTICE_SPECIALITIES[0],
  province: SA_PROVINCES[0],
  email: "",
  phone: "",
  practiceSize: PRACTICE_SIZES[0],
  nextStep: PRACTICE_NEXT_STEPS[0],
  consent: false,
  website: "",
};

const TRACKING_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
];

const input =
  "w-full rounded-full border border-slate-300 bg-white px-5 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

const BENEFITS = [
  { icon: Video, text: "Video, voice and in-person bookings in one calendar" },
  { icon: FileText, text: "Digital patient records and e-prescriptions" },
  { icon: Receipt, text: "Medical aid invoices your patients can download" },
  { icon: CalendarCheck, text: "Reminders and notifications sent for you" },
];

/**
 * "Digitise Your Medical Practice" enquiry: the landing page for practitioners
 * who click our Meta ads. Submitting emails the enquiry to the admin inbox.
 */
export default function PracticeEnquiryPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [message, setMessage] = useState("");
  const tracking = useRef<Record<string, string>>({});

  // Keep the ad's UTM tags / fbclid so the admin email shows which campaign the lead came from.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    for (const k of TRACKING_KEYS) {
      const v = sp.get(k);
      if (v) tracking.current[k] = v;
    }
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const local: Record<string, string> = {};
    if (form.fullName.trim().length < 2)
      local.fullName = "Enter your full name.";
    if (form.practiceName.trim().length < 2)
      local.practiceName = "Enter your practice or medical centre name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()))
      local.email = "Enter a valid email address.";
    if (form.phone.replace(/\D/g, "").length < 9)
      local.phone = "Enter a South African mobile number.";
    if (!form.consent)
      local.consent = "Please agree to be contacted so we can respond.";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/contact/practice-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tracking: tracking.current }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setStatus("sent");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setErrors(json.errors ?? {});
      setMessage(json.error || "Something went wrong. Please try again.");
    } catch {
      setMessage("Network error. Please check your connection and try again.");
    }
    setStatus("idle");
  }

  return (
    <div className="min-h-screen bg-surface-soft">
      <header className="bg-white border-b border-slate-100">
        <div className="container mx-auto max-w-[1200px] px-4 md:px-8 py-4">
          <Link
            href="/"
            aria-label="24/7 DigiMedCare home"
            className="inline-block"
          >
            <LogoMain width={150} height={48} alt={false} />
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-[1200px] px-4 md:px-8 py-8 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-14 items-start">
          {/* Pitch */}
          <section className="lg:col-span-2 lg:sticky lg:top-10">
            <p className="text-xs font-semibold tracking-widest text-ink-400">
              24/7 DIGIMEDCARE
            </p>
            <h1 className="mt-2 flex items-start gap-3 text-3xl md:text-4xl font-semibold text-ink-900 font-grotesk leading-tight">
              <HeartPulse className="mt-1 h-8 w-8 shrink-0 text-primary" />
              Digitise Your Medical Practice
            </h1>
            <p className="mt-3 text-ink-600 text-base md:text-lg leading-relaxed">
              Complete this quick enquiry to learn more about joining
              DigiMedCare.
            </p>
            <ul className="mt-8 hidden lg:block space-y-4">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-ink-700">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={20} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </section>

          {/* Form */}
          <section className="lg:col-span-3 rounded-3xl bg-white p-6 md:p-10 shadow-sm border border-slate-100">
            {status === "sent" ? (
              <div className="py-10 text-center" role="status">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
                <h2 className="mt-4 text-2xl font-semibold text-ink-900 font-grotesk">
                  Thank you, we’ve received your enquiry
                </h2>
                <p className="mt-2 text-ink-600">
                  Our team will contact you on {form.email} or WhatsApp shortly.
                </p>
                <Link
                  href="/"
                  className="mt-8 inline-block font-semibold text-primary hover:underline"
                >
                  Explore 24/7 DigiMedCare
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-6">
                <Field
                  label="Full name"
                  required
                  error={errors.fullName}
                  htmlFor="pe-name"
                >
                  <input
                    id="pe-name"
                    className={input}
                    autoComplete="name"
                    placeholder="Dr First Name Surname"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                  />
                </Field>
                <Field
                  label="Practice / Medical Centre name"
                  required
                  error={errors.practiceName}
                  htmlFor="pe-practice"
                >
                  <input
                    id="pe-practice"
                    className={input}
                    autoComplete="organization"
                    placeholder="Enter practice name"
                    value={form.practiceName}
                    onChange={(e) => set("practiceName", e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field
                    label="Medical speciality"
                    required
                    error={errors.speciality}
                    htmlFor="pe-speciality"
                  >
                    <div className="relative">
                      <select
                        id="pe-speciality"
                        className={`${input} appearance-none pr-12`}
                        value={form.speciality}
                        onChange={(e) => set("speciality", e.target.value)}
                      >
                        {PRACTICE_SPECIALITIES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    </div>
                  </Field>
                  <Field
                    label="Province"
                    required
                    error={errors.province}
                    htmlFor="pe-province"
                  >
                    <div className="relative">
                      <select
                        id="pe-province"
                        className={`${input} appearance-none pr-12`}
                        value={form.province}
                        onChange={(e) => set("province", e.target.value)}
                      >
                        {SA_PROVINCES.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    </div>
                  </Field>
                </div>
                <Field
                  label="Email address"
                  required
                  error={errors.email}
                  htmlFor="pe-email"
                >
                  <input
                    id="pe-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className={input}
                    placeholder="doctor@practice.co.za"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </Field>
                <Field
                  label="Mobile / WhatsApp number"
                  required
                  error={errors.phone}
                  htmlFor="pe-phone"
                >
                  <input
                    id="pe-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={input}
                    placeholder="+27 82 123 4567"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </Field>

                <Radios
                  label="Practice size"
                  name="practiceSize"
                  options={PRACTICE_SIZES}
                  value={form.practiceSize}
                  onChange={(v) => set("practiceSize", v)}
                  error={errors.practiceSize}
                />
                <Radios
                  label="How would you like to proceed?"
                  name="nextStep"
                  options={PRACTICE_NEXT_STEPS}
                  value={form.nextStep}
                  onChange={(v) => set("nextStep", v)}
                  error={errors.nextStep}
                />

                {/* Honeypot for bots; hidden from people and screen readers. */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                />

                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0 accent-primary"
                      checked={form.consent}
                      onChange={(e) => set("consent", e.target.checked)}
                    />
                    <span className="text-sm md:text-base text-ink-700 leading-relaxed">
                      I agree to be contacted by 24/7 DigiMedCare regarding my
                      enquiry and understand that my information will be
                      processed in accordance with the{" "}
                      <Link
                        href="/popia-consent-notice"
                        target="_blank"
                        className="font-semibold text-primary underline"
                      >
                        privacy notice
                      </Link>
                      .
                    </span>
                  </label>
                  {errors.consent && (
                    <p className="mt-1.5 ml-8 text-sm text-red-600">
                      {errors.consent}
                    </p>
                  )}
                </div>

                {message && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-bold text-white hover:bg-primary/90 disabled:opacity-60 transition"
                >
                  {status === "sending" && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                  {status === "sending" ? "Sending…" : "Submit enquiry"}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm md:text-base text-ink-600"
      >
        {label}
        {required && " *"}
      </label>
      {children}
      {error && <p className="mt-1.5 ml-5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Radios({
  label,
  name,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm md:text-base text-ink-600">
        {label}
      </legend>
      <div className="space-y-1">
        {options.map((o) => (
          <label
            key={o}
            className="flex items-center gap-3 rounded-xl px-1 py-2 cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              className="h-5 w-5 accent-ink-900"
              checked={value === o}
              onChange={() => onChange(o)}
            />
            <span className="text-base text-ink-900">{o}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </fieldset>
  );
}
