"use client";

import React from "react";
import Link from "next/link";
import { BiCheckCircle, BiArrowBack } from "react-icons/bi";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useForgotPassword } from "./useForgotPassword";
import { PASSWORD_RULES } from "@/lib/auth/passwordRules";

export default function ForgotPasswordForm() {
  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    error,
    success,
    sent,
    mode,
    fieldErrors,
    handleSubmit,
  } = useForgotPassword();

  const isReset = mode === "reset";

  return (
    <div className="bg-white rounded-lg w-full max-w-lg mx-auto p-6 md:p-10 py-12 flex flex-col justify-center">
      {/* Header */}
      <div className="mb-6 gap-4 flex flex-col">
        <h2 className="text-2xl font-bold text-slate-900 leading-[0.95] tracking-tighter mb-2.5 font-grotesk">
          {isReset ? "Choose a New Password" : "Reset Password"}
        </h2>
        <p className="text-slate-500 max-w-[380px] text-sm lg:text-base">
          {isReset
            ? "Choose a new password for your account. You'll use it to sign in from now on."
            : "Enter the email or SA ID on your account and we'll send you a link to reset your password."}
        </p>
      </div>

      {success ? (
        <div
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
          role="status"
        >
          <BiCheckCircle size={20} />
          Password updated — taking you to sign in…
        </div>
      ) : sent ? (
        // Worded so it holds whether or not the address is registered — the
        // API answers identically either way so that this page can't be used
        // to find out which addresses have accounts.
        <div
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-semibold text-center"
          role="status"
        >
          <BiCheckCircle size={20} className="inline mb-1 mr-1" />
          If that account exists, a reset link is on its way. The link is valid
          for 10 minutes.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6 mb-7.5">
            {!isReset && (
              <Input
                label="Email or SA ID"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                error={fieldErrors.identifier}
                placeholder="you@example.com"
                autoComplete="username"
              />
            )}

            {isReset && (
            <Input
              label="New Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              placeholder="••••••••••••••••"
              autoComplete="new-password"
            />
            )}

            {/* Live strength checklist */}
            {isReset && (
            <ul className="flex flex-col gap-1.5 px-1">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(password);
                return (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                      met ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center text-[9px] ${
                        met
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      ✓
                    </span>
                    {rule.label}
                  </li>
                );
              })}
            </ul>
            )}

            {isReset && (
              <Input
                label="Confirm New Password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={fieldErrors.confirmPassword}
                placeholder="••••••••••••••••"
                autoComplete="new-password"
              />
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm font-bold text-center" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth={true} loading={loading}>
            {isReset ? "Update Password" : "Send Reset Link"}
          </Button>
        </form>
      )}

      <div className="text-center flex justify-center items-center gap-2 text-slate-700 mt-8">
        <Link
          href="/login"
          className="text-primary flex items-center gap-2 font-semibold underline hover:text-[#326E8A] transition-all"
        >
          <BiArrowBack size={16} />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
