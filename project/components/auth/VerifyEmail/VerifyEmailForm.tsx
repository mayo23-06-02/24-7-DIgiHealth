"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { BiEnvelope, BiLoaderAlt, BiCheckCircle, BiMailSend } from "react-icons/bi";

/**
 * Email verification via Supabase magic / sign-in link only (no OTP code).
 */
export default function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = (searchParams?.get("email") || "").trim().toLowerCase();
  const linkError = searchParams?.get("error") || "";

  const [email, setEmail] = useState(initialEmail);
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(linkError);
  const [info, setInfo] = useState("");
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (linkError) setError(linkError);
  }, [linkError]);

  // Auto-send magic link when arriving from registration
  useEffect(() => {
    if (!initialEmail || !initialEmail.includes("@")) return;
    if (searchParams?.get("error")) return;
    void sendLink(initialEmail, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail]);

  const sendLink = async (targetEmail?: string, silent = false) => {
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
        body: JSON.stringify({ email: e, purpose: "verify" }),
      });
      const data = await res.json();
      if (data.alreadyVerified) {
        setAlreadyVerified(true);
        setInfo("Email is already verified. You can sign in.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to send sign-in link");
      setEmail(e);
      setLinkSent(true);
      setInfo(
        `We sent a sign-in link to ${e}. Open it on this device to verify, then sign in with your password.`,
      );
    } catch (err: any) {
      setError(err?.message || "Failed to send sign-in link");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg lg:rounded-r-none w-full max-w-lg mx-auto lg:max-w-2/5 lg:w-1/2 p-4 md:p-8 py-12 flex flex-col justify-center">
      <div className="mb-6 gap-3 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {alreadyVerified || linkSent ? (
            linkSent && !alreadyVerified ? (
              <BiMailSend size={28} />
            ) : (
              <BiCheckCircle size={28} />
            )
          ) : (
            <BiEnvelope size={28} />
          )}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tighter font-grotesk">
          {alreadyVerified
            ? "Email already verified"
            : linkSent
              ? "Check your email"
              : "Verify your email"}
        </h2>
        <p className="text-slate-500 text-sm max-w-sm">
          {alreadyVerified
            ? "Your account is ready. Sign in with your email and password."
            : linkSent
              ? "Click the sign-in link in the email we sent. No code is required."
              : "We will email you a one-click sign-in link to confirm your DigiHealth account."}
        </p>
      </div>

      {alreadyVerified ? (
        <div className="space-y-4">
          {info && (
            <p className="text-sm font-semibold text-emerald-600 text-center">
              {info}
            </p>
          )}
          <Button
            fullWidth
            onClick={() =>
              router.push(
                `/login?registered=true&verified=true&email=${encodeURIComponent(email)}`,
              )
            }
          >
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
          />

          {linkSent && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
              <p className="text-sm font-bold text-slate-800">
                Sign-in link sent
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Open the email and click{" "}
                <span className="font-semibold">Confirm your mail</span> / the
                DigiHealth link. You will return here verified, then use your
                password on the login page.
              </p>
            </div>
          )}

          <Button
            type="button"
            fullWidth
            disabled={sending}
            onClick={() => void sendLink()}
            icon={
              sending ? (
                <BiLoaderAlt className="animate-spin" size={18} />
              ) : (
                <BiMailSend size={18} />
              )
            }
            iconPosition="left"
          >
            {sending
              ? "Sending link…"
              : linkSent
                ? "Resend sign-in link"
                : "Send sign-in link"}
          </Button>

          {error && (
            <p className="text-red-500 text-sm font-bold text-center">{error}</p>
          )}
          {info && !error && (
            <p className="text-emerald-600 text-sm font-semibold text-center">
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
