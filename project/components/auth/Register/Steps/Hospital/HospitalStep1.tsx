"use client";
import React from "react";
import Input from "@/components/ui/Input";

export default function HospitalStep1({ formData, updateData, errors }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 px-4 py-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">
          Facility Details
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Facility Name *"
          value={formData.facilityName || ""}
          error={errors?.facilityName}
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
          <label className="block text-sm font-bold text-slate-700">
            Facility Type *
          </label>
          <div className="flex gap-3 flex-wrap">
            {["Public", "Private", "NGO / Clinic"].map((type) => (
              <label
                key={type}
                className={`flex items-center gap-3 px-5 py-3.5 rounded-full border-2 cursor-pointer transition-all ${
                  formData.facilityType === type
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-100 bg-slate-50 text-slate-500 hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="facilityType"
                  checked={formData.facilityType === type}
                  onChange={() => updateData("facilityType", type)}
                  className="accent-primary"
                />
                <span className="font-bold text-sm">{type}</span>
              </label>
            ))}
          </div>
          {errors?.facilityType && (
            <p className="text-xs text-red-500 font-medium">
              {errors.facilityType}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
