"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Lock, Loader2, CheckCircle2, Mail } from "lucide-react";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Email verification via a 6-digit code sent by email.
 * Verifying also logs the user in (the API sets the session cookie).
 */
export default function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = (searchParams?.get("email") || "").trim().toLowerCase();
  /** Registration sets this to say a code has already been issued. */
  const alreadySent = searchParams?.get("sent") === "1";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const hasAutoSent = useRef(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  /**
   * Send a code on arrival — unless one was just issued.
   *
   * Registration already issues a code as part of creating the account, and
   * issuing a new one overwrites the stored hash. Auto-sending here as well
   * meant every new user received two emails and only the second worked, since
   * the first had been invalidated the moment the second was written.
   *
   * Registration now arrives with ?sent=1 to say a code is already in flight.
   * Other entry points (an unverified login attempt, a bookmarked link) carry
   * no flag and still get one automatically.
   */
  useEffect(() => {
    if (!initialEmail || !initialEmail.includes("@")) return;
    if (hasAutoSent.current) return;
    hasAutoSent.current = true;

    if (alreadySent) {
      setCodeSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setInfo(
        `We sent a 6-digit code to ${initialEmail}. Enter it below to activate your account.`,
      );
      return;
    }
    void sendCode(initialEmail, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail, alreadySent]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async (targetEmail?: string, silent = false) => {
    const e = (targetEmail || email).trim().toLowerCase();
    setError("");
    if (!silent) setInfo("");
    if (!e || !e.includes("@")) {
      setError("Enter the email you registered with.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      });
      const data = await res.json();
      if (data.alreadyVerified) {
        setAlreadyVerified(true);
        setInfo("Email is already verified. You can sign in.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to send verification code");
      setEmail(e);
      setCodeSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setInfo(`We sent a 6-digit code to ${e}. Enter it below to activate your account.`);
    } catch (err: any) {
      setError(err?.message || "Failed to send verification code");
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await res.json();
      if (data.alreadyVerified) {
        setAlreadyVerified(true);
        setInfo("Email is already verified. You can sign in.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Verification failed");
      // Verified, not signed in. Confirming an email proves the mailbox, not
      // the password, so the account holder signs in themselves. The address
      // is carried across so the login form arrives prefilled.
      setInfo("Email verified. Sign in to continue.");
      router.push(
        `/login?verified=true&email=${encodeURIComponent(data.user?.email || email)}`,
      );
    } catch (err: any) {
      setError(err?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-white rounded-lg lg:rounded-r-none w-full max-w-lg mx-auto lg:max-w-2/5 lg:w-1/2 p-4 md:p-8 py-12 flex flex-col justify-center">
      <div className="mb-6 gap-3 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {alreadyVerified ? (
            <CheckCircle2 size={28} />
          ) : codeSent ? (
            <Lock size={28} />
          ) : (
            <Mail size={28} />
          )}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tighter font-grotesk">
          {alreadyVerified
            ? "Email already verified"
            : codeSent
              ? "Enter your code"
              : "Verify your email"}
        </h2>
        <p className="text-slate-500 text-sm max-w-sm">
          {alreadyVerified
            ? "Your account is ready. Sign in with your email and password."
            : codeSent
              ? "We emailed a 6-digit code — it expires in 10 minutes."
              : "We'll email you a 6-digit code to confirm your DigiHealth account."}
        </p>
      </div>

      {alreadyVerified ? (
        <div className="space-y-4">
          {info && (
            <p className="text-sm font-semibold text-success-700 text-center">
              {info}
            </p>
          )}
          <Button fullWidth onClick={() => router.push(`/login?email=${encodeURIComponent(email)}`)}>
            Continue to sign in
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <Input
            label="Email address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={codeSent}
          />

          {codeSent && (
            <Input
              label="6-digit code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="text-center text-2xl tracking-[0.5em] font-bold"
              autoFocus
            />
          )}

          {codeSent ? (
            <Button
              type="button"
              fullWidth
              disabled={verifying || code.length !== 6}
              onClick={() => void verifyCode()}
              icon={verifying ? <Loader2 className="animate-spin" size={18} /> : undefined}
              iconPosition="left"
            >
              {verifying ? "Verifying…" : "Verify & continue"}
            </Button>
          ) : (
            <Button
              type="button"
              fullWidth
              disabled={sending}
              onClick={() => void sendCode()}
              icon={sending ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
              iconPosition="left"
            >
              {sending ? "Sending code…" : "Send verification code"}
            </Button>
          )}

          {codeSent && (
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={sending || cooldown > 0}
              className="w-full text-center text-sm font-semibold text-primary disabled:text-slate-300 disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          )}

          {error && (
            <p className="text-danger-500 text-sm font-bold text-center">{error}</p>
          )}
          {info && !error && (
            <p className="text-success-700 text-sm font-semibold text-center">
              {info}
            </p>
          )}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-slate-600">
        Already verified?{" "}
        <Link href="/login" className="font-semibold text-primary underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
