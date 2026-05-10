"use client";
import React from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import CloudinaryUpload from "@/components/ui/CloudinaryUpload";

// ─────────────────────────────────────────────
// Step 1 – Professional Credentials
// ─────────────────────────────────────────────
export function PractitionerStep1({ formData, updateData, errors }: any) {
  const specializations = [
    "General Practitioner",
    "Paediatrician",
    "Cardiologist",
    "Dermatologist",
    "Psychiatrist",
    "Gynaecologist",
    "Neurologist",
    "Radiologist",
    "Surgeon",
    "Ophthalmologist",
  ];
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div
        style={{ padding: "10px 20px", marginBottom: "20px" }}
        className="inline-flex items-center gap-2 px-4 py-2  mb-2"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary  tracking-normal">
          Medical Credentials
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="HPCSA Registration Number *"
          value={formData.hpcsaNumber || ""}
          error={errors?.hpcsaNumber}
          onChange={(e) =>
            updateData("hpcsaNumber", e.target.value.toUpperCase())
          }
          placeholder="e.g. MP123456"
          className="md:col-span-2"
        />
        <Input
          label="Practice Number *"
          value={formData.practiceNumber || ""}
          error={errors?.practiceNumber}
          onChange={(e) => updateData("practiceNumber", e.target.value)}
          placeholder="e.g. 0123456"
        />
        <Input
          label="Years of Experience *"
          type="number"
          min={0}
          max={60}
          value={formData.experience || ""}
          onChange={(e) => updateData("experience", e.target.value)}
          placeholder="e.g. 7"
        />
        <div className="md:col-span-2 space-y-2">
          <h1 className="block text-sm font-bold text-slate-700">
            Primary Specialisation *
          </h1>
          <select
            value={formData.specialization || ""}
            onChange={(e) => updateData("specialization", e.target.value)}
            className={`w-full px-5 py-3 bg-slate-50 border-2 rounded-full outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 font-medium appearance-none cursor-pointer ${errors?.specialization ? "border-red-400" : "border-slate-100"}`}
          >
            <option value="">-- Select --</option>
            {specializations.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors?.specialization && (
            <p className="text-xs font-bold text-red-500">
              {errors.specialization}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 2 – Identity & Contact
// ─────────────────────────────────────────────
export function PractitionerStep2({ formData, updateData, errors }: any) {
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
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div
        style={{ padding: "10px 20px", marginBottom: "20px" }}
        className="inline-flex items-center gap-2 px-4 py-2  mb-2"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs font-bold text-primary ">
          Identity & Practice Info
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Legal Name *"
          value={formData.fullName || ""}
          onChange={(e) => updateData("fullName", e.target.value)}
          placeholder="Dr. Jane Smith"
          className="md:col-span-2"
        />
        <Input
          label="SA ID Number *"
          maxLength={13}
          value={formData.saId || ""}
          error={errors?.saId}
          onChange={(e) =>
            updateData("saId", e.target.value.replace(/\D/g, ""))
          }
        />
        <Input
          label="Mobile Number *"
          type="tel"
          value={formData.mobile || ""}
          onChange={(e) => updateData("mobile", e.target.value)}
        />
        <Input
          label="Work Email *"
          type="email"
          value={formData.email || ""}
          onChange={(e) => updateData("email", e.target.value)}
          className="md:col-span-2"
        />
        <Input
          label="Street Address *"
          value={formData.street || ""}
          onChange={(e) => updateData("street", e.target.value)}
          className="md:col-span-2"
        />
        <Input
          label="City *"
          value={formData.city || ""}
          onChange={(e) => updateData("city", e.target.value)}
        />
        <div className="space-y-2">
          <h1 className="block text-sm font-bold text-slate-700">Province *</h1>
          <select
            value={formData.province || ""}
            onChange={(e) => updateData("province", e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-full outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 font-medium appearance-none cursor-pointer"
          >
            <option value="">Select Province</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
          <div>
            <h1 className="text-sm font-bold text-slate-700 mb-1">
              Languages Spoken *
            </h1>
            <p className="text-xs text-slate-500 mb-3">
              Select all languages you can comfortably conduct consultations in.
            </p>
            <div className="grid lg:grid-cols-5 sm:grid-cols-3 gap-3">
              {[
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
              ].map((lang) => {
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
                    className={`flex items-center gap-2 cursor-pointer px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 text-primary shadow-none"
                        : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${isSelected ? "bg-primary" : "bg-slate-300"}`}
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

// ─────────────────────────────────────────────
// Step 3 – Documents & Verification
// ─────────────────────────────────────────────
export function PractitionerStep3({ formData, updateData }: any) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <CloudinaryUpload
        label="Profile Photo *"
        description="Select or drag a professional headshot for your practitioner profile"
        value={formData.profilePhoto}
        onUploadComplete={(url) => updateData("profilePhoto", url)}
      />

      <CloudinaryUpload
        label="HPCSA Registration Certificate *"
        description="Upload a certified copy of your HPCSA registration"
        accept="application/pdf"
        value={formData.hpcsaCert}
        onUploadComplete={(url) => updateData("hpcsaCert", url)}
      />

      <h1
        className={`flex items-start gap-4 p-6 rounded-lg border-2 cursor-pointer transition-all ${formData.bgCheckConsent ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50"}`}
      >
        <input
          type="checkbox"
          checked={formData.bgCheckConsent || false}
          onChange={(e) => updateData("bgCheckConsent", e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-primary shrink-0"
        />
        <span className="text-sm font-bold text-slate-700 leading-relaxed">
          I consent to a professional background verification via the 24/7
          TeleHealth vetted network.
        </span>
      </h1>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 4 – Banking Details
// ─────────────────────────────────────────────
export function PractitionerStep4({ formData, updateData }: any) {
  const banks = [
    "ABSA",
    "FNB",
    "Standard Bank",
    "Nedbank",
    "Capitec",
    "African Bank",
    "Investec",
  ];
  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <h3 className=" font-semibold text-slate-900   font-grotesk">
        Earnings Account *
      </h3>
      <div className="bg-slate-200 rounded-lg p-10 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2 space-y-2">
            <h1 className="block text-sm font-bold text-slate-900 ">
              Account Holder Name
            </h1>
            <input
              type="text"
              value={formData.bankHolder || ""}
              onChange={(e) => updateData("bankHolder", e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-lg px-5 py-3.5 outline-none focus:ring-2 focus:ring-primary text-slate-900"
              placeholder="Enter Account Holder Name"
            />
          </div>
          <div className="space-y-2">
            <h1 className="block text-sm font-bold text-slate-900 ">
              Bank Name
            </h1>
            <select
              value={formData.bankName || ""}
              onChange={(e) => updateData("bankName", e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-lg px-5 py-3.5 outline-none focus:ring-2 focus:ring-primary text-slate-900 appearance-none cursor-pointer"
            >
              <option value="" className="text-slate-900">
                Select Bank
              </option>
              {banks.map((b) => (
                <option key={b} value={b} className="text-slate-900">
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <h1 className="block text-sm font-bold text-slate-900 ">
              Account Number
            </h1>
            <input
              type="text"
              value={formData.bankAccount || ""}
              placeholder="Enter Account Number"
              onChange={(e) => updateData("bankAccount", e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-lg px-5 py-3.5 outline-none text-slate-900 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
