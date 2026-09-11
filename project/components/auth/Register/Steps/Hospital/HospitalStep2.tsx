"use client";
import React from "react";
import Input from "@/components/ui/Input";
import DocumentUpload from "@/components/ui/DocumentUpload";

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

export default function HospitalStep2({ formData, updateData, errors }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Physical Address *"
          value={formData.street || ""}
          error={errors?.street}
          onChange={(e) => updateData("street", e.target.value)}
          placeholder="Street Address"
          className="md:col-span-2"
        />
        <Input
          label="City *"
          value={formData.city || ""}
          error={errors?.city}
          onChange={(e) => updateData("city", e.target.value)}
          placeholder="City"
        />
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">
            Province *
          </label>
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
          {errors?.province && (
            <p className="text-xs text-red-500 font-medium">
              {errors.province}
            </p>
          )}
        </div>

        <div className="md:col-span-2 border-t border-slate-100 pt-6">
          <h3 className="text-lg font-bold text-slate-700 tracking-normal mb-4 font-grotesk">
            Admin Representative
          </h3>
        </div>
        <Input
          label="Admin Name *"
          value={formData.adminName || ""}
          error={errors?.adminName}
          onChange={(e) => updateData("adminName", e.target.value)}
          placeholder="Full Name"
        />
        <Input
          label="Work Email *"
          type="email"
          value={formData.adminEmail || ""}
          error={errors?.adminEmail}
          onChange={(e) => updateData("adminEmail", e.target.value)}
          placeholder="admin@facility.co.za"
          disabled={!!formData.adminInviteToken}
          helperText={
            formData.adminInviteToken
              ? "Locked — this invite was sent to this address"
              : undefined
          }
        />
        <DocumentUpload
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
