"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface HospitalOption {
  id: string;
  name: string;
  city: string | null;
}

interface Prefill {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string | null;
}

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none";
const primaryBtn =
  "w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50";

/**
 * Patient registration. Step one is the hospital file number: nobody can create a profile
 * without a record their hospital has already loaded. A match pre-fills the details and
 * emails a set-password link to the address the hospital holds.
 */
export default function FileNumberRegistration() {
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [facilityId, setFacilityId] = useState("");
  const [fileNumber, setFileNumber] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [useDob, setUseDob] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<{ hospital: string; prefill: Prefill | null; state: string } | null>(null);
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    fetch("/api/facilities/public")
      .then((r) => r.json())
      .then((j) => setHospitals(j?.data ?? []))
      .catch(() => setError("Could not load hospitals. Please refresh."));
  }, []);

  const body = () => ({
    facilityId,
    fileNumber: fileNumber.trim(),
    ...(useDob ? { dateOfBirth } : { idNumber: idNumber.trim() }),
  });

  async function post(url: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body()),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Something went wrong.");
    return json.data;
  }

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await post("/api/auth/file-number/lookup");
      setFound({ hospital: d.hospital?.name ?? "", prefill: d.prefill, state: d.state });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function claim() {
    setBusy(true);
    setError("");
    try {
      const d = await post("/api/auth/file-number/claim");
      setSentTo(d.email ?? "");
      setFound((f) => (f ? { ...f, state: d.state } : f));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-lg bg-white p-6 py-10 md:p-10">
      <h2 className="mb-2 font-grotesk text-2xl font-bold tracking-tight text-slate-900">
        Register with your file number
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        You can join once your hospital has registered you. Enter the file number they gave you.
        The service is free.
      </p>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {sentTo ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
          We sent a link to <strong>{sentTo}</strong>. Open it to choose your password and finish
          your profile. The link works for 7 days.
        </div>
      ) : found?.state === "has_account" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This file already belongs to an account.{" "}
          <Link href="/login" className="font-bold underline">
            Sign in
          </Link>{" "}
          instead.
        </div>
      ) : found ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
            <p className="mb-1 font-bold text-slate-900">We found you at {found.hospital}</p>
            {found.prefill && (
              <ul className="space-y-0.5">
                <li>
                  {found.prefill.firstName} {found.prefill.lastName}
                </li>
                <li>Email on file: {found.prefill.email}</li>
                {found.prefill.mobile && <li>Mobile on file: {found.prefill.mobile}</li>}
              </ul>
            )}
          </div>
          <button className={primaryBtn} onClick={claim} disabled={busy}>
            {busy ? "Sending…" : "Email me a link to finish"}
          </button>
          <button className="w-full text-sm text-slate-500 underline" onClick={() => setFound(null)}>
            Not me, go back
          </button>
        </div>
      ) : (
        <form onSubmit={lookup} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Hospital
            <select className={field} value={facilityId} onChange={(e) => setFacilityId(e.target.value)} required>
              <option value="">Select your hospital</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                  {h.city ? `, ${h.city}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            File number
            <input className={field} value={fileNumber} onChange={(e) => setFileNumber(e.target.value)} required />
          </label>
          {useDob ? (
            <label className="block text-sm font-medium text-slate-700">
              Date of birth
              <input type="date" className={field} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
            </label>
          ) : (
            <label className="block text-sm font-medium text-slate-700">
              SA ID number
              <input
                className={field}
                inputMode="numeric"
                maxLength={13}
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
                required
              />
            </label>
          )}
          <button type="button" className="text-xs text-slate-500 underline" onClick={() => setUseDob((v) => !v)}>
            {useDob ? "Use my ID number instead" : "I don't have an ID number, use date of birth"}
          </button>
          <button className={primaryBtn} disabled={busy || !facilityId}>
            {busy ? "Checking…" : "Find my record"}
          </button>
          <p className="text-center text-xs text-slate-500">
            Not registered yet? Ask your hospital to add you. Already registered?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
