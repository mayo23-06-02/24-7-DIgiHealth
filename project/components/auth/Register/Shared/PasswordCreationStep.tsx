"use client";
import React from "react";
import Input from "@/components/ui/Input";
import { BiLockAlt } from "react-icons/bi";

export default function PasswordCreationStep({
  formData,
  updateData,
  errors,
}: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="bg-primary/5 p-8 rounded-lg border border-primary/10">
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white mb-6">
          <BiLockAlt size={24} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2 font-grotesk">
          Secure Your Account
        </h3>
        <p className="text-sm text-slate-500 mb-8">
          Create a strong password to protect your account and data.
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
            label="Confirm Password *"
            type="password"
            placeholder="Repeat your password"
            value={formData.confirmPassword || ""}
            error={errors?.confirmPassword}
            onChange={(e) => updateData("confirmPassword", e.target.value)}
          />
        </div>

        <div className="mt-8 space-y-3">
          <p className="text-xs font-bold text-slate-500 tracking-widest">
            Password Requirements:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "Minimum 8 characters",
              "At least one uppercase letter",
              "At least one number",
              "At least one special character",
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
    </div>
  );
}
