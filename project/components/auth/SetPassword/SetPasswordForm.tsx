"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PASSWORD_RULES } from "@/lib/auth/passwordRules";

interface Info {
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  hospitals: string[];
  emergencyContact: { name?: string; phone?: string; relationship?: string } | null;
  medicalAid: { provider?: string; planName?: string; memberNumber?: string } | null;
}

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none";

/** Landing page for the emailed link: choose a password, fill any missing details, accept consent. */
export default function SetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [info, setInfo] = useState<Info | null>(null);
  const [loadError, setLoadError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accept, setAccept] = useState(false);
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRel, setEcRel] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("This link is missing its token.");
      return;
    }
    fetch(`/api/auth/set-password?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || "This link is invalid or has expired.");
        setInfo(j.data);
        setEcName(j.data.emergencyContact?.name ?? "");
        setEcPhone(j.data.emergencyContact?.phone ?? "");
        setEcRel(j.data.emergencyContact?.relationship ?? "");
      })
      .catch((e) => setLoadError(e.message));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword: confirm,
          acceptTerms: accept,
          ...(info?.role === "patient"
            ? { emergencyContact: { name: ecName, phone: ecPhone, relationship: ecRel } }
            : { bio }),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Could not set your password.");
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shell = "mx-auto w-full max-w-lg rounded-lg bg-white p-6 py-10 md:p-10";

  if (loadError)
    return (
      <div className={shell}>
        <p className="text-sm text-red-700" role="alert">{loadError}</p>
        <Link href="/login" className="mt-4 inline-block font-bold text-primary underline">Go to sign in</Link>
      </div>
    );
  if (!info) return <div className={`${shell} animate-pulse min-h-[320px]`} />;
  if (done)
    return (
      <div className={shell}>
        <h2 className="mb-2 font-grotesk text-2xl font-bold text-slate-900">Your account is ready</h2>
        <Link href="/login" className="font-bold text-primary underline">Sign in</Link>
      </div>
    );

  return (
    <form onSubmit={submit} className={`${shell} space-y-4`}>
      <h2 className="font-grotesk text-2xl font-bold tracking-tight text-slate-900">
        Welcome, {info.firstName}
      </h2>
      <p className="text-sm text-slate-500">
        {info.hospitals.length ? `Registered by ${info.hospitals.join(", ")}. ` : ""}
        Choose a password for {info.email}.
      </p>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <label className="block text-sm font-medium text-slate-700">
        Password
        <input type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Confirm password
        <input type="password" className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
      </label>
      <ul className="list-disc pl-5 text-xs text-slate-500">
        {PASSWORD_RULES.map((r) => (
          <li key={r.label}>{r.label}</li>
        ))}
      </ul>

      {info.role === "patient" ? (
        <fieldset className="space-y-3 border-t border-slate-200 pt-4">
          <legend className="text-sm font-bold text-slate-900">Emergency contact</legend>
          <input className={field} placeholder="Name" value={ecName} onChange={(e) => setEcName(e.target.value)} />
          <input className={field} placeholder="Phone" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} />
          <input className={field} placeholder="Relationship" value={ecRel} onChange={(e) => setEcRel(e.target.value)} />
        </fieldset>
      ) : (
        <label className="block text-sm font-medium text-slate-700">
          Short bio (optional)
          <textarea className={field} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
      )}

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1" />
        <span>I accept the terms and consent to the processing of my information (POPIA).</span>
      </label>
      <button disabled={busy || !accept} className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
