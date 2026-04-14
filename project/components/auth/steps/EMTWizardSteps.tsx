"use client";
import React from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FileUpload from "@/components/ui/FileUpload";

const municipalities = [
  "City of Johannesburg",
  "City of Tshwane",
  "Ekurhuleni",
  "City of Cape Town",
  "eThekwini",
  "Nelson Mandela Bay",
  "Mangaung",
  "Buffalo City",
  "Msunduzi",
];

export function EMTStep1({ formData, updateData, errors }: any) {
  const employers = [
    "ER24",
    "Netcare 911",
    "Western Cape EMS",
    "Johannesburg EMS",
    "KZN EMS",
    "Private Ambulance",
  ];
  return (
    <div className="space-y-4 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 px-[10px] py-[5px] rounded-full bg-red-100 mb-[10px]">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        <span className="text-xs font-bold text-red-600 ">EMT Credentials</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="EMT Registration Number *"
          value={formData.emtRegNumber || ""}
          error={errors?.emtRegNumber}
          onChange={(e) => updateData("emtRegNumber", e.target.value)}
          placeholder="e.g. HPCSA/EMT/0123456"
          className="md:col-span-2"
        />
        <div className="md:col-span-2 space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Employer / Service *
          </label>
          <div className="flex flex-wrap gap-3">
            {employers.map((emp) => (
              <label
                key={emp}
                className={`flex items-center gap-3 px-[15px] py-[5px] rounded-full border-2 cursor-pointer transition-all ${formData.employer === emp ? "border-red-400 bg-red-50 text-red-600" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-red-200"}`}
              >
                <input
                  type="radio"
                  name="employer"
                  checked={formData.employer === emp}
                  onChange={() => updateData("employer", emp)}
                  className="accent-red-500"
                />
                <span className="font-bold text-sm">{emp}</span>
              </label>
            ))}
          </div>
        </div>
        <Input
          label="Years of Experience"
          type="number"
          min={0}
          value={formData.experience || ""}
          onChange={(e) => updateData("experience", e.target.value)}
          placeholder="e.g. 3"
        />
      </div>
    </div>
  );
}

export function EMTStep2({ formData, updateData }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Name *"
          value={formData.fullName || ""}
          onChange={(e) => updateData("fullName", e.target.value)}
          placeholder="e.g. Sipho Dlamini"
          className="md:col-span-2"
        />
        <Input
          label="Mobile *"
          type="tel"
          value={formData.mobile || ""}
          onChange={(e) => updateData("mobile", e.target.value)}
          placeholder="+27 71 000 0000"
        />
        <Input
          label="Email"
          type="email"
          value={formData.email || ""}
          onChange={(e) => updateData("email", e.target.value)}
          placeholder="emt@service.co.za"
        />
        <div className="md:col-span-2 space-y-4">
          <label className="block text-sm font-bold text-slate-700 mb-[10px]">
            Coverage Areas (select all that apply)
          </label>
          <div className="py-4 mt-4 mb-4 border- border-slate-100 rounded-lg grid custom-scrollbar grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {municipalities.map((m) => (
              <label
                key={m}
                className={`flex bg-gray-200 items-center gap-3 px-4 py-2 rounded-full border-2 transition-all cursor-pointer ${(formData.coverageAreas || []).includes(m) ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-slate-50 shadow-xs hover:border-primary/20"}`}
              >
                <input
                  type="checkbox"
                  checked={(formData.coverageAreas || []).includes(m)}
                  onChange={(e) => {
                    const areas = formData.coverageAreas || [];
                    updateData(
                      "coverageAreas",
                      e.target.checked
                        ? [...areas, m]
                        : areas.filter((a: string) => a !== m),
                    );
                  }}
                  className="w-4 h-4 accent-primary rounded shrink-0"
                />
                <span className="text-sm font-bold">{m}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EMTStep3({ formData, updateData }: any) {
  return (
    <div className="space-y-6 gap-[20px] animate-in slide-in-from-right-6 duration-500 flex flex-col">
      <FileUpload
        label="Profile Photo *"
        description="Select or drag a professional headshot for your digital EMT profile"
        accept="JPEG, PNG or SVG profile photos"
        value={
          formData.profilePhoto
            ? [{ name: formData.profilePhoto.name, status: "completed" }]
            : []
        }
        onRemove={() => updateData("profilePhoto", null)}
      />

      <FileUpload
        label="EMT Certification (PDF) *"
        description="Upload a certified copy of your current HPCSA/EMT registration"
        accept="PDF certificate only"
        value={
          formData.certificationFile
            ? [{ name: formData.certificationFile.name, status: "completed" }]
            : []
        }
        onRemove={() => updateData("certificationFile", null)}
      />
      <div className="space-y-3">
        {[
          {
            field: "enableOfflineGPS",
            label: "Enable offline mode for emergency GPS routing",
          },
          {
            field: "offlineMapsConsent",
            label: "I consent to download offline map data for emergency use",
          },
        ].map(({ field, label }) => (
          <label
            key={field}
            className={`flex items-start gap-4 px-[20px] py-[10px] mb-[10px] rounded-lg border cursor-pointer transition-all ${(formData as any)[field] ? "border-red-400 bg-red-50" : "border-slate-100  hover:border-red-200"}`}
          >
            <input
              type="checkbox"
              checked={(formData as any)[field] || false}
              onChange={(e) => updateData(field, e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-red-500 shrink-0"
            />
            <span className="text-sm font-bold text-slate-700 leading-relaxed">
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function EMTStep4({ formData, updateData }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="bg-primary rounded-lg p-6 text-white">
        <h3 className="text-xs font-bold text-white/60 mb-4">
          Emergency Services Network
        </h3>
        <h2 className="text-3xl font-black mb-5 leading-tight">
          POPIA Declaration
        </h2>
        <p className="text-white/80 text-sm ">
          As a first responder, your data enables life-saving routing and
          dispatch. We process your location and credentials strictly for
          emergency coordination.
        </p>
      </div>
      <label
        htmlFor="emt-popia"
        className={`flex items-start justify-center gap-5 p-6 rounded-lg border cursor-pointer transition-all ${formData.consent ? "border-primary bg-primary/5" : "border-slate-100  hover:border-primary/20"}`}
      >
        <input
          id="emt-popia"
          type="checkbox"
          checked={formData.consent || false}
          onChange={(e) => updateData("consent", e.target.checked)}
          className="mt-0.5 w-6 h-6 accent-primary shrink-0"
        />
        <span className="text-xs font-semibold text-slate-700 ">
          I consent to 24/7 TeleHealth processing my location, credentials, and
          emergency data under POPIA for dispatch coordination.
        </span>
      </label>
    </div>
  );
}
