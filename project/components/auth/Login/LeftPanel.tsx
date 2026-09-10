import React, { useEffect } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useLogin } from "./useLogin";
import SocialLoginButtons from "./SocialLoginButtons";

interface LeftPanelProps {
  isRegistered: boolean;
  isVerified?: boolean;
  isReset?: boolean;
  prefillEmail?: string;
  login: ReturnType<typeof useLogin>;
}

export default function LeftPanel({
  isRegistered,
  isVerified,
  isReset,
  prefillEmail,
  login,
}: LeftPanelProps) {
  const {
    role,
    setRole,
    identifier,
    setIdentifier,
    password,
    setPassword,
    loading,
    error,
    handleLogin,
    mfaRequired,
    mfaEmail,
    code,
    setCode,
    verifyingCode,
    resending,
    resendCooldown,
    handleVerifyMfa,
    handleResendCode,
    handleBackToPassword,
  } = login;

  useEffect(() => {
    if (prefillEmail && !identifier) {
      setIdentifier(prefillEmail);
    }
  }, [prefillEmail, identifier, setIdentifier]);

  const roleLabel = {
    Patient: "Email or SA ID",
    Practitioner: "Email or HPCSA Number",
    Admin: "Email Address",
  }[role];

  if (mfaRequired) {
    return (
      <div className="bg-white rounded-lg lg:rounded-r-none lg:px-8 py-12 w-full max-w-lg mx-auto lg:max-w-2/5 lg:w-1/2  p-4 md:p-8 flex flex-col justify-center">
        <div className="mb-6 gap-3 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Mail size={28} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tighter font-grotesk">
            Enter your code
          </h2>
          <p className="text-slate-500 text-sm max-w-sm">
            We emailed a 6-digit code to{" "}
            <span className="font-semibold text-slate-700">{mfaEmail}</span> —
            it expires in 10 minutes.
          </p>
        </div>

        <form onSubmit={handleVerifyMfa} className="space-y-5">
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

          {error && (
            <p className="text-red-500 text-sm font-bold text-center">{error}</p>
          )}

          <Button
            type="submit"
            fullWidth
            disabled={verifyingCode || code.length !== 6}
            loading={verifyingCode}
          >
            Verify & continue
          </Button>

          <button
            type="button"
            onClick={() => void handleResendCode()}
            disabled={resending || resendCooldown > 0}
            className="w-full text-center text-sm font-semibold text-primary disabled:text-slate-300 disabled:cursor-not-allowed"
          >
            {resending
              ? "Sending…"
              : resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Resend code"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleBackToPassword}
          className="mt-8 text-center text-sm text-slate-600 hover:text-primary"
        >
          &larr; Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg lg:rounded-r-none lg:px-8 py-12 w-full max-w-lg mx-auto lg:max-w-2/5 lg:w-1/2  p-4 md:p-8 flex flex-col justify-center">
      {/* Header */}
      <div className="mb-6  flex border-b border-slate-200 pb-4 flex-col">
        <h2 className="text-3xl md:text-3xl font-bold text-slate-900 leading-[0.95] tracking-tighter mb-2.5 font-grotesk">
          Sign In
        </h2>
        <p className="text-slate-500 max-w-[380px] text-sm lg:text-base">
          Login for 24/7 expert medical support across South Africa.
        </p>
      </div>

      {/* Password reset banner */}
      {isReset && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
          <span className="w-5 h-5 rounded-lg bg-emerald-100 flex items-center justify-center">
            ✓
          </span>
          Password updated! Sign in with your new password.
        </div>
      )}

      {/* Email verified banner */}
      {isVerified && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-500">
          <span className="w-5 h-5 rounded-lg bg-emerald-100 flex items-center justify-center">
            ✓
          </span>
          Email verified! Sign in with your password to continue.
        </div>
      )}

      {/* Registration success */}
      {isRegistered && !isVerified && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-500">
          <span className="w-5 h-5 rounded-lg bg-emerald-100 flex items-center justify-center">
            ✓
          </span>
          Account created! Sign in with your password to continue.
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2 mb-7.5">
          <Input
            label={roleLabel}
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={
              role === "Patient"
                ? "e.g. 900101 5678 087"
                : role === "Practitioner"
                  ? "e.g. MP0123456"
                  : "admin@digihealth.co.za"
            }
          />

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="block text-sm font-bold text-slate-700">
                Password
              </span>
              <Link
                href="/forgot-password"
                className="inline-flex items-center min-h-11 text-xs font-bold text-slate-500 hover:text-primary transition-all hover:underline decoration-2 underline-offset-4"
              >
                Forgot Password?
              </Link>
            </div>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm font-bold text-center">{error}</p>
        )}

        <Button type="submit" fullWidth={true} loading={loading}>
          Login
        </Button>
      </form>

      

      <div className=" text-sm text-center mt-4 flex justify-center   text-slate-700">
        <p>Don&apos;t have an account yet?</p>
        <Link
          href="/register"
          className="inline-flex items-center min-h-11 text-primary-500 hover:text-primary-600 transition-all ml-1 pb-1"
        >
          <span className="font-semibold text-primary-500 underline">
            Register Here
          </span>
        </Link>
      </div>
    </div>
  );
}
