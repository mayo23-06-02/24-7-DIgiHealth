"use client";
import React from "react";
import Input from "@/components/ui/Input";

const provinces = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Free State",
  "Northern Cape",
];

const languagesList = [
  "English",
  "Afrikaans",
  "isiZulu",
  "isiXhosa",
  "Sesotho",
  "Sepedi",
  "Setswana",
  "siSwati",
  "Tshivenda",
  "Xitsonga",
  "isiNdebele",
];

export default function PractitionerStep2({
  formData,
  updateData,
  errors,
}: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 px-4 py-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">
          Identity & Practice Info
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Legal Name *"
          value={formData.fullName || ""}
          error={errors?.fullName}
          onChange={(e) => updateData("fullName", e.target.value)}
          placeholder="Dr. Jane Smith"
          className="md:col-span-2"
        />
        <Input
          label="SA ID Number"
          maxLength={13}
          value={formData.saId || ""}
          error={errors?.saId}
          onChange={(e) =>
            updateData("saId", e.target.value.replace(/\D/g, ""))
          }
          placeholder="Optional"
        />
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">
            Mobile Number *
          </label>
          <div className="flex gap-2">
            <div className="w-36 shrink-0">
              <select
                value={formData.countryCode || "+27"}
                onChange={(e) => updateData("countryCode", e.target.value)}
                className="w-full px-3 py-4 bg-slate-50/80 border-none rounded-full focus:ring-4 focus:ring-primary/10 focus:bg-white text-slate-900 outline-none transition-all duration-500 font-medium text-sm"
              >
                <option value="+27">ZA (+27)</option>
                <option value="+268">SZ (+268)</option>
              </select>
            </div>
            <Input
              type="tel"
              value={formData.mobile || ""}
              error={errors?.mobile}
              onChange={(e) =>
                updateData("mobile", e.target.value.replace(/\D/g, ""))
              }
              placeholder={
                formData.countryCode === "+268" ? "76 123 456" : "82 123 4567"
              }
              className="flex-1"
            />
          </div>
          <p className="text-[11px] text-slate-400 px-1">
            South Africa (+27) or Eswatini (+268)
          </p>
          {errors?.mobile && (
            <p className="text-xs text-red-500 font-medium">{errors.mobile}</p>
          )}
        </div>
        <Input
          label="Work Email *"
          type="email"
          value={formData.email || ""}
          error={errors?.email}
          onChange={(e) => updateData("email", e.target.value)}
          placeholder="doctor@practice.co.za"
          className="md:col-span-2"
        />
        <Input
          label="Street Address *"
          value={formData.street || ""}
          error={errors?.street}
          onChange={(e) => updateData("street", e.target.value)}
          placeholder="123 Main St"
          className="md:col-span-2"
        />
        <Input
          label="City *"
          value={formData.city || ""}
          error={errors?.city}
          onChange={(e) => updateData("city", e.target.value)}
          placeholder="Johannesburg"
        />
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">
            Province *
          </label>
          <select
            value={formData.province || ""}
            onChange={(e) => updateData("province", e.target.value)}
            className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-full outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 font-medium appearance-none cursor-pointer ${
              errors?.province ? "border-red-400" : "border-slate-100"
            }`}
          >
            <option value="">Select Province</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {errors?.province && (
            <p className="text-xs font-bold text-red-500">{errors.province}</p>
          )}
        </div>

        <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">
              Languages Spoken *
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Select all languages you can comfortably conduct consultations in.
            </p>
            <div className="grid lg:grid-cols-5 sm:grid-cols-3 gap-3">
              {languagesList.map((lang) => {
                const isSelected = (formData.languages || []).includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      const current = formData.languages || [];
                      const next = isSelected
                        ? current.filter((l: string) => l !== lang)
                        : [...current, lang];
                      updateData("languages", next);
                    }}
                    className={`flex items-center gap-2 cursor-pointer px-4 py-3 rounded-lg border text-sm font-bold transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 text-primary shadow-none"
                        : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? "bg-primary" : "bg-slate-300"
                      }`}
                    />
                    {lang}
                  </button>
                );
              })}
            </div>
            {errors?.languages && (
              <p className="text-xs font-bold text-red-500 mt-2">
                {errors.languages}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
