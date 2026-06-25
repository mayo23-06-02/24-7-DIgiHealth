"use client";
import React from "react";
import Input from "@/components/ui/Input";

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

export default function PractitionerStep1({
  formData,
  updateData,
  errors,
}: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 px-4 py-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">
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
          error={errors?.experience}
          onChange={(e) => updateData("experience", e.target.value)}
          placeholder="e.g. 7"
        />
        <div className="md:col-span-2 space-y-2">
          <label className="block text-sm font-bold text-slate-700">
            Primary Specialisation *
          </label>
          <select
            value={formData.specialization || ""}
            onChange={(e) => updateData("specialization", e.target.value)}
            className={`w-full px-5 py-3 bg-slate-50 border-2 rounded-full outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 font-medium appearance-none cursor-pointer ${
              errors?.specialization ? "border-red-400" : "border-slate-100"
            }`}
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
