"use client";
import React from "react";
import Input from "@/components/ui/Input";

export default function HospitalStep3({ formData, updateData, errors }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <label
        className={`flex items-start gap-5 p-8 rounded-lg border-2 cursor-pointer transition-all ${
          formData.b2bAgreement
            ? "border-primary bg-primary/5"
            : "border-slate-100 bg-slate-50 hover:border-primary/30"
        }`}
      >
        <input
          type="checkbox"
          checked={formData.b2bAgreement || false}
          onChange={(e) => updateData("b2bAgreement", e.target.checked)}
          className="mt-0.5 w-6 h-6 accent-primary shrink-0"
        />
        <div>
          <p className="font-bold text-slate-800 mb-1">
            Accept B2B Emergency Dispatch Agreement *
          </p>
          <p className="text-sm text-slate-500 leading-relaxed">
            I agree to the 24/7 TeleHealth Platform Terms, Fee Structure (15%
            per routed emergency), and Dispatch Escalation Protocol.
          </p>
        </div>
      </label>
      {errors?.b2bAgreement && (
        <p className="text-xs text-red-500 font-medium">
          {errors.b2bAgreement}
        </p>
      )}

      <Input
        label="VAT Registration Number (optional)"
        value={formData.vatNumber || ""}
        onChange={(e) => updateData("vatNumber", e.target.value)}
        placeholder="e.g. 4012345678"
      />
    </div>
  );
}
