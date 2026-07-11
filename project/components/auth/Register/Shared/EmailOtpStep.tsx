"use client";

import React from "react";
import Input from "@/components/ui/Input";
import { BiLockAlt, BiEnvelope } from "react-icons/bi";

/**
 * Registration security step — password only.
 * Email verification happens after account creation on /verify-email.
 */
export default function EmailOtpStep({
  formData,
  updateData,
  errors,
}: any) {
  const email = (
    formData.email ||
    formData.adminEmail ||
    ""
  )
    .trim()
    .toLowerCase();

  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="bg-primary/5 p-8 rounded-lg border border-primary/10">
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white mb-6">
          <BiLockAlt size={24} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2 font-grotesk">
          Secure your account
        </h3>
        <p className="text-sm text-slate-500 mb-8">
          Create a password for day-to-day sign-in. After you finish
          registration we will email a one-click sign-in link to verify your
          address (no code required).
        </p>

        <div className="space-y-6">
          <Input
            label="Password *"
            type="password"
            placeholder="At least 8 characters"
            value={formData.password || ""}
            error={errors?.password}
            onChange={(e) => updateData("password", e.target.value)}
          />
          <Input
            label="Confirm password *"
            type="password"
            placeholder="Repeat your password"
            value={formData.confirmPassword || ""}
            error={errors?.confirmPassword}
            onChange={(e) => updateData("confirmPassword", e.target.value)}
          />
        </div>

        <div className="mt-8 space-y-3">
          <p className="text-xs font-bold text-slate-500 tracking-widest">
            Password requirements
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "Minimum 8 characters",
              "At least one uppercase letter",
              "At least one number",
            ].map((req, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-xs text-slate-500 font-medium"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                {req}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 flex gap-3">
        <BiEnvelope className="text-primary shrink-0 mt-0.5" size={22} />
        <div>
          <p className="text-sm font-bold text-slate-800">
            Next: verify your email
          </p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            We will send a sign-in link to{" "}
            <span className="font-semibold text-slate-700">
              {email || "your address"}
            </span>
            . Click the link to verify, then sign in with this password.
          </p>
        </div>
      </div>
    </div>
  );
}
