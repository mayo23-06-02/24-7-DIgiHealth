"use client";
import React from "react";

const banks = [
  "ABSA",
  "FNB",
  "Standard Bank",
  "Nedbank",
  "Capitec",
  "African Bank",
  "Investec",
];

export default function PractitionerStep4({
  formData,
  updateData,
  errors,
}: any) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <h3 className="font-semibold text-slate-900 font-grotesk">
        Earnings Account *
      </h3>
      <div className="bg-slate-200 rounded-lg p-10 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-bold text-slate-900">
              Account Holder Name *
            </label>
            <input
              type="text"
              value={formData.bankHolder || ""}
              onChange={(e) => updateData("bankHolder", e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-lg px-5 py-3.5 outline-none focus:ring-2 focus:ring-primary text-slate-900"
              placeholder="Enter Account Holder Name"
            />
            {errors?.bankHolder && (
              <p className="text-xs font-bold text-red-500">
                {errors.bankHolder}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-900">
              Bank Name *
            </label>
            <select
              value={formData.bankName || ""}
              onChange={(e) => updateData("bankName", e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-lg px-5 py-3.5 outline-none focus:ring-2 focus:ring-primary text-slate-900 appearance-none cursor-pointer"
            >
              <option value="">Select Bank</option>
              {banks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {errors?.bankName && (
              <p className="text-xs font-bold text-red-500">
                {errors.bankName}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-900">
              Account Number *
            </label>
            <input
              type="text"
              value={formData.bankAccount || ""}
              placeholder="Enter Account Number"
              onChange={(e) => updateData("bankAccount", e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-lg px-5 py-3.5 outline-none text-slate-900 font-mono"
            />
            {errors?.bankAccount && (
              <p className="text-xs font-bold text-red-500">
                {errors.bankAccount}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
