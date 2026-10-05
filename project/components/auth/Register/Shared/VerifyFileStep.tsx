"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import { BiCheckCircle, BiLoaderAlt, BiSearch } from "react-icons/bi";

interface Hospital {
  id: string;
  name: string;
  city: string | null;
}

const cap = (s: unknown) =>
  typeof s === "string" && s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

/**
 * Registration step 1: prove the hospital registered you.
 *
 * Patients give their hospital, file number and SA ID number (or date of birth when the
 * hospital holds no ID). Doctors give their hospital, staff number and HPCSA number. A match
 * pre-fills the wizard's later steps from the hospital's record; the wizard cannot move on
 * until `fileClaim.verified` is set.
 */
export default function VerifyFileStep({ formData, updateData, errors, role }: any) {
  const isDoctor = role === "practitioner";
  const claim = formData.fileClaim ?? {};
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [facilityId, setFacilityId] = useState<string>(claim.facilityId ?? "");
  const [fileNumber, setFileNumber] = useState<string>(claim.fileNumber ?? "");
  const [idNumber, setIdNumber] = useState<string>(claim.idNumber ?? "");
  const [dateOfBirth, setDateOfBirth] = useState<string>(claim.dateOfBirth ?? "");
  const [hpcsaNumber, setHpcsaNumber] = useState<string>(claim.hpcsaNumber ?? "");
  const [useDob, setUseDob] = useState<boolean>(!!claim.dateOfBirth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasAccount, setHasAccount] = useState(false);
  const [linkSent, setLinkSent] = useState("");

  useEffect(() => {
    fetch("/api/facilities/public")
      .then((r) => r.json())
      .then((j) => setHospitals(j?.data ?? []))
      .catch(() => setError("Could not load hospitals. Please refresh the page."));
  }, []);

  // Arrived from the emailed setup link: already verified, nothing to enter.
  if (formData.setupToken && claim.verified) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
        <Verified hospital={claim.hospitalName} fileNumber={claim.fileNumber} isDoctor={isDoctor} viaLink />
      </div>
    );
  }

  const body = () => ({
    kind: isDoctor ? "doctor" : "patient",
    facilityId,
    fileNumber: fileNumber.trim(),
    ...(isDoctor
      ? { hpcsaNumber: hpcsaNumber.trim().toUpperCase() }
      : useDob
        ? { dateOfBirth }
        : { idNumber: idNumber.trim() }),
  });

  const reset = () => {
    setHasAccount(false);
    setLinkSent("");
    if (claim.verified) updateData("fileClaim", { ...claim, verified: false });
  };

  async function verify() {
    setBusy(true);
    setError("");
    reset();
    try {
      const res = await fetch("/api/auth/file-number/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body()),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "We couldn't match those details.");
      const d = json.data;
      if (d.state === "has_account") {
        setHasAccount(true);
        return;
      }
      // Pre-fill the later steps from the hospital's record; anything the person already
      // typed in this session wins, so going back to step 1 never wipes their edits.
      const prefill: Record<string, unknown> = { ...(d.prefill ?? {}) };
      if (prefill.gender) prefill.gender = cap(prefill.gender);
      for (const [k, v] of Object.entries(prefill)) {
        const cur = formData[k];
        if (cur === undefined || cur === "" || (Array.isArray(cur) && cur.length === 0)) updateData(k, v);
      }
      updateData("fileClaim", {
        ...body(),
        verified: true,
        hospitalName: d.hospital?.name,
        fileNumber: d.fileNumber,
        maskedEmail: d.maskedEmail,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function emailLink() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/file-number/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body()),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Could not send the link.");
      setLinkSent(json.data?.email ?? "your email");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const ready = facilityId && fileNumber.trim() && (isDoctor ? hpcsaNumber.trim() : useDob ? dateOfBirth : idNumber.length === 13);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">
          {isDoctor ? "Verify your staff number" : "Verify your hospital file number"}
        </span>
      </div>
      <p className="text-sm text-slate-500 max-w-xl">
        {isDoctor
          ? "Your hospital registered you on 24/7 DigiHealth. Enter the staff number they gave you and your HPCSA number to continue."
          : "You can join once your hospital has registered you. Enter the file number they gave you. We'll fill in what your hospital already has, so you only complete what's missing."}
      </p>

      {claim.verified ? (
        <Verified hospital={claim.hospitalName} fileNumber={claim.fileNumber} isDoctor={isDoctor} maskedEmail={claim.maskedEmail} onChange={reset} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="verify-hospital" className="block text-sm font-bold text-slate-700">
              Hospital *
            </label>
            <select
              id="verify-hospital"
              value={facilityId}
              onChange={(e) => {
                setFacilityId(e.target.value);
                reset();
              }}
              className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none"
            >
              <option value="">Select your hospital</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                  {h.city ? ` — ${h.city}` : ""}
                </option>
              ))}
            </select>
          </div>
          <Input
            label={isDoctor ? "Staff number *" : "File number *"}
            value={fileNumber}
            placeholder={isDoctor ? "e.g. DR-0457" : "e.g. MP-004211"}
            onChange={(e) => {
              setFileNumber(e.target.value);
              reset();
            }}
          />
          {isDoctor ? (
            <Input
              label="HPCSA number *"
              value={hpcsaNumber}
              placeholder="e.g. MP0123456"
              onChange={(e) => {
                setHpcsaNumber(e.target.value.toUpperCase());
                reset();
              }}
            />
          ) : useDob ? (
            <Input
              label="Date of birth *"
              type="date"
              value={dateOfBirth}
              onChange={(e) => {
                setDateOfBirth(e.target.value);
                reset();
              }}
            />
          ) : (
            <Input
              label="SA ID number *"
              inputMode="numeric"
              maxLength={13}
              value={idNumber}
              placeholder="13 digits"
              onChange={(e) => {
                setIdNumber(e.target.value.replace(/\D/g, ""));
                reset();
              }}
            />
          )}
          {!isDoctor && (
            <button
              type="button"
              onClick={() => setUseDob((v) => !v)}
              className="md:col-span-2 justify-self-start text-xs font-semibold text-primary underline"
            >
              {useDob ? "Use my SA ID number instead" : "I don't have an SA ID number"}
            </button>
          )}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={verify}
              disabled={!ready || busy}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? <BiLoaderAlt className="animate-spin" /> : <BiSearch />}
              {busy ? "Checking…" : "Find my record"}
            </button>
          </div>
        </div>
      )}

      {(error || errors?.fileClaim) && !claim.verified && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || errors.fileClaim}
        </div>
      )}

      {hasAccount && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This {isDoctor ? "staff number" : "file number"} already belongs to an account.{" "}
          <Link href="/login" className="font-bold underline">
            Sign in instead
          </Link>
          .
        </div>
      )}

      {!claim.verified && !hasAccount && ready && (
        <p className="text-xs text-slate-500">
          Can't finish now?{" "}
          {linkSent ? (
            <span className="font-semibold text-emerald-700">We sent a link to {linkSent}. It works for 7 days.</span>
          ) : (
            <button type="button" onClick={emailLink} disabled={busy} className="font-semibold text-primary underline">
              Email me a link to finish later
            </button>
          )}
        </p>
      )}
    </div>
  );
}

function Verified({
  hospital,
  fileNumber,
  isDoctor,
  maskedEmail,
  viaLink,
  onChange,
}: {
  hospital?: string;
  fileNumber?: string;
  isDoctor: boolean;
  maskedEmail?: string;
  viaLink?: boolean;
  onChange?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900" role="status">
      <p className="flex items-center gap-2 font-bold">
        <BiCheckCircle size={20} /> We found you{hospital ? ` at ${hospital}` : ""}
      </p>
      <p className="mt-1">
        {isDoctor ? "Staff number" : "File number"} <strong>{fileNumber}</strong>.
        {viaLink
          ? " Your details from the hospital are filled in. Check them and complete what's missing."
          : " Your details from the hospital are filled in on the next steps."}
      </p>
      {maskedEmail && !viaLink && (
        <p className="mt-1">
          Use the email your hospital has on file: <strong>{maskedEmail}</strong>
        </p>
      )}
      {onChange && (
        <button type="button" onClick={onChange} className="mt-2 text-xs font-semibold underline">
          Not you? Change details
        </button>
      )}
    </div>
  );
}
