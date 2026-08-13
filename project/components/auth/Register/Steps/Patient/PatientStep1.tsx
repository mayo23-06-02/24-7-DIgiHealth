"use client";
import React from "react";
import Input from "@/components/ui/Input";

const countryCodes = [
  { code: "+27", label: "(+27)", placeholder: "82 123 4567" },
  { code: "+268", label: "(+268)", placeholder: "76 123 456" },
];

const genders = ["Male", "Female"];

export default function PatientStep1({ formData, updateData, errors }: any) {
  const countryCode = formData.countryCode || "+27";
  const selectedCc =
    countryCodes.find((c) => c.code === countryCode) || countryCodes[0];

  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">
          Patient Identity
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name *"
          value={formData.firstName || ""}
          placeholder="e.g. Thabo"
          error={errors?.firstName}
          onChange={(e) => updateData("firstName", e.target.value)}
        />
        <Input
          label="Last Name *"
          value={formData.lastName || ""}
          placeholder="e.g. Mokoena"
          error={errors?.lastName}
          onChange={(e) => updateData("lastName", e.target.value)}
        />

        <Input
          label="SA Identity Number *"
          maxLength={13}
          value={formData.saId || ""}
          placeholder="13-digit national ID number"
          error={errors?.saId}
          onChange={(e) =>
            updateData("saId", e.target.value.replace(/\D/g, ""))
          }
        />

        {/* Phone with country code — ZA (+27) or Eswatini (+268) */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">
            Mobile Number *
          </label>
          <div className="flex gap-2">
            <div className="w-18 text-xs shrink-0">
              <select
                value={countryCode}
                onChange={(e) => updateData("countryCode", e.target.value)}
                className="w-full px-2 py-4   text-slate-900 outline-none transition-all duration-500 font-medium "
              >
                {countryCodes.map((cc) => (
                  <option key={cc.code} value={cc.code}>
                    {cc.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              type="tel"
              value={formData.mobile || ""}
              placeholder={selectedCc.placeholder}
              error={errors?.mobile}
              onChange={(e) =>
                updateData("mobile", e.target.value.replace(/\D/g, ""))
              }
              className="flex-1"
            />
          </div>
         
         
        </div>

        <Input
          label="Date of Birth *"
          type="date"
          value={formData.dob || ""}
          error={errors?.dob}
          onChange={(e) => updateData("dob", e.target.value)}
        />

        <Input
          label="Email Address *"
          type="email"
          value={formData.email || ""}
          error={errors?.email}
          placeholder="your@email.co.za"
          onChange={(e) => updateData("email", e.target.value)}
          className="md:col-span-2"
        />

        <div className="md:col-span-2 space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Biological Gender *
          </label>
          <div className="flex flex-wrap gap-2">
            {genders.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => updateData("gender", g)}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all border-2 ${
                  formData.gender === g
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-slate-100 text-slate-500"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          {errors?.gender && (
            <p className="text-xs text-red-500 font-medium">{errors.gender}</p>
          )}
        </div>
      </div>
    </div>
  );
}
