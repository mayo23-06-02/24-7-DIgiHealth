"use client";
import React from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import CloudinaryUpload from "@/components/ui/CloudinaryUpload";

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

export function HospitalStep1({ formData, updateData, errors }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 px-4 py-2  mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary  tracking-normal">
          Facility Details
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Facility Name *"
          value={formData.facilityName || ""}
          onChange={(e) => updateData("facilityName", e.target.value)}
          placeholder="e.g. Mediclinic Sandton"
          className="md:col-span-2"
        />
        <Input
          label="DoH Registration Number *"
          value={formData.dohRegNumber || ""}
          error={errors?.dohRegNumber}
          onChange={(e) => updateData("dohRegNumber", e.target.value)}
          placeholder="e.g. PR0123456"
        />
        <Input
          label="Bed Capacity"
          type="number"
          min={1}
          value={formData.bedCapacity || ""}
          onChange={(e) => updateData("bedCapacity", e.target.value)}
          placeholder="e.g. 120"
        />
        <div className="md:col-span-2 space-y-4">
          <h1 className="block text-sm font-bold text-slate-700">
            Facility Type *
          </h1>
          <div className="flex gap-3 flex-wrap">
            {["Public", "Private", "NGO / Clinic"].map((type) => (
              <h1
                key={type}
                className={`flex items-center gap-3 px-5 py-3.5 rounded-full border-2 cursor-pointer transition-all ${formData.facilityType === type ? "border-primary bg-primary/5 text-primary" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-primary/30"}`}
              >
                <input
                  type="radio"
                  name="facilityType"
                  checked={formData.facilityType === type}
                  onChange={() => updateData("facilityType", type)}
                  className="accent-primary"
                />
                <span className="font-bold text-sm">{type}</span>
              </h1>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HospitalStep2({ formData, updateData }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Physical Address *"
          value={formData.street || ""}
          onChange={(e) => updateData("street", e.target.value)}
          placeholder="Street Address"
          className="md:col-span-2"
        />
        <Input
          label="City *"
          value={formData.city || ""}
          onChange={(e) => updateData("city", e.target.value)}
          placeholder="City"
        />
        <div className="space-y-2">
          <h1 className="block text-sm font-bold text-slate-700">Province *</h1>
          <select
            required
            value={formData.province || ""}
            onChange={(e) => updateData("province", e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-lg outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 font-medium appearance-none cursor-pointer"
          >
            <option value="">Select Province</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 border-t border-slate-100 pt-6">
          <h3 className="text-lg font-bold text-slate-700  tracking-normal mb-4 font-grotesk">
            Admin Representative
          </h3>
        </div>
        <Input
          label="Admin Name *"
          value={formData.adminName || ""}
          onChange={(e) => updateData("adminName", e.target.value)}
          placeholder="Full Name"
        />
        <Input
          label="Work Email *"
          type="email"
          value={formData.adminEmail || ""}
          onChange={(e) => updateData("adminEmail", e.target.value)}
          placeholder="admin@facility.co.za"
        />
        <CloudinaryUpload
          label="Proof of Employment (PDF) *"
          description="Upload a certified proof of employment for the administrator"
          accept="application/pdf"
          value={formData.proofOfEmployment}
          onUploadComplete={(url) => updateData("proofOfEmployment", url)}
        />
      </div>
    </div>
  );
}

export function HospitalStep3({ formData, updateData }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <h1
        className={`flex items-start gap-5 p-8 rounded-lg border-2 cursor-pointer transition-all ${formData.b2bAgreement ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50 hover:border-primary/30"}`}
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
      </h1>
      <Input
        label="VAT Registration Number (optional)"
        value={formData.vatNumber || ""}
        onChange={(e) => updateData("vatNumber", e.target.value)}
        placeholder="e.g. 4012345678"
      />
    </div>
  );
}

export function HospitalStep4({ formData, updateData }: any) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <CloudinaryUpload
        label="Facility Profile Logo *"
        description="Select or drag a professional logo for the facility (Square recommended)"
        value={formData.facilityLogo}
        onUploadComplete={(url) => updateData("facilityLogo", url)}
      />

      <CloudinaryUpload
        label="Facility Wallpaper *"
        description="Select or drag a high-resolution wallpaper"
        value={formData.facilityWallpaper}
        onUploadComplete={(url) => updateData("facilityWallpaper", url)}
      />

      <CloudinaryUpload
        label="Registration Certificate (PDF) *"
        description="Upload a certified facility registration certificate"
        accept="application/pdf"
        value={formData.regCertificate}
        onUploadComplete={(url) => updateData("regCertificate", url)}
      />
    </div>
  );
}
