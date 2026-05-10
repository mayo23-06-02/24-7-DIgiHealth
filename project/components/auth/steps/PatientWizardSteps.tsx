"use client";
import React, { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  BiBulb,
  BiCheckCircle,
  BiCreditCard,
  BiShieldQuarter,
  BiLockAlt,
  BiCalendar,
  BiUser,
  BiSolidCheckCircle,
  BiSolidUserPlus,
} from "react-icons/bi";
import Image from "next/image";
import CloudinaryUpload from "@/components/ui/CloudinaryUpload";

// ─────────────────────────────────────────────
// Step 1 – Identity
// ─────────────────────────────────────────────
export function PatientStep1({ formData, updateData, errors }: any) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2  rounded-full ">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs  text-primary  tracking-normal">
          Patient Identity
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
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
          className="md:col-span-2"
        />
        <Input
          label="Mobile Number *"
          type="tel"
          value={formData.mobile || ""}
          placeholder="+27 71 000 0000"
          error={errors?.mobile}
          onChange={(e) => updateData("mobile", e.target.value)}
        />
        <Input
          label="Date of Birth *"
          type="date"
          value={formData.dob || ""}
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
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Step 2 – POPIA Consent
// ─────────────────────────────────────────
export function POPIAConsentStep({ formData, updateData }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500  flex flex-col">
      <div className="bg-primary rounded-md p-8 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-2xl" />
        <h3 className="text-xs  text-white/60 mb-4 font-grotesk">
          Legal Compliance
        </h3>
        <h2 className="text-3xl font-bold mb-5 leading-tight font-grotesk">
          Privacy Declaration
        </h2>
        <p className="text-white/80 text-sm  mb-8">
          Under the Protection of Personal Information Act (POPIA), 24/7
          TeleHealth is required to obtain your express consent before
          processing any personal or health data.
        </p>
        <ul className="space-y-3 mt-[20px]">
          {[
            "Your data is encrypted at rest and in transit",
            "You can withdraw consent at any time",
            "Data is never sold to third parties",
            "Access logs are kept for your security",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 text-sm font-semibold my-[10px]"
            >
              <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <label
        htmlFor="popia-consent"
        className={`flex items-start gap-5 p-8 rounded-md  cursor-pointer transition-all duration-300 ${formData.consent ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50 hover:border-primary/30"}`}
      >
        <input
          id="popia-consent"
          type="checkbox"
          checked={formData.consent || false}
          onChange={(e) => updateData("consent", e.target.checked)}
          className="mt-0.5 w-6 h-6 rounded text-primary focus:ring-primary border-slate-300 accent-primary shrink-0"
        />
        <span className="text-sm font-bold text-slate-700 leading-relaxed">
          I consent to 24/7 TeleHealth storing and processing my health data as
          per POPIA. I understand I can{" "}
          <span className="text-primary underline decoration-2 underline-offset-4">
            withdraw this consent
          </span>{" "}
          at any time by contacting support@24-7telehealth.co.za.
        </span>
      </label>
    </div>
  );
}

// ─────────────────────────────────────────
// Step 3 – Anthropometric Step
// ─────────────────────────────────────────
const bloodTypes = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Unknown",
];
const genders = ["Male", "Female", "Non-binary / Other", "Prefer not to say"];
const activityLevels = [
  "Sedentary (little or no exercise)",
  "Lightly active (1–3×/week)",
  "Moderately active (3-5×/week)",
  "Very active (6-7×/week)",
  "Athlete / Highly active",
];

const commonAllergies = [
  "Peanuts",
  "Tree Nuts",
  "Milk / Dairy",
  "Eggs",
  "Wheat / Gluten",
  "Soy",
  "Fish",
  "Shellfish",
  "Penicillin",
  "Sulfa Drugs",
  "Aspirin / NSAIDs",
  "Latex",
  "Pollen",
  "Dust Mites",
  "Pet Dander",
  "Bee Stings",
  "Mold",
  "Strawberries",
  "Fragrance / Perfume",
  "Cockroaches",
];

const commonConditions = [
  "Hypertension",
  "Diabetes (Type 2)",
  "Diabetes (Type 1)",
  "Asthma",
  "Arthritis",
  "Heart Disease",
  "High Cholesterol",
  "HIV/AIDS",
  "Tuberculosis (TB)",
  "Depression",
  "Anxiety",
  "Obesity",
  "Cancer",
  "Kidney Disease",
  "Liver Disease",
  "Stroke Survivor",
  "Epilepsy",
  "Alzheimer's",
  "COPD",
  "Thyroid Disorder",
];

export function PatientAnthropometricStep({
  formData,
  updateData,
  onSkip,
}: any) {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");

  const heightCm = parseFloat(formData.heightCm) || 0;
  const weightKg = parseFloat(formData.weightKg) || 0;
  const bmi =
    heightCm > 0 && weightKg > 0
      ? (weightKg / (heightCm / 100) ** 2).toFixed(1)
      : null;

  const bmiCategory = bmi
    ? parseFloat(bmi) < 18.5
      ? { label: "Underweight", color: "text-blue-600 bg-blue-50" }
      : parseFloat(bmi) < 25
        ? { label: "Healthy Weight", color: "text-green-600 bg-green-50" }
        : parseFloat(bmi) < 30
          ? { label: "Overweight", color: "text-gray-600 bg-gray-50" }
          : { label: "Obese", color: "text-red-600 bg-red-50" }
    : null;

  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500 py-[60px] mb-[30px]">
      <div className="flex items-start gap-2 p-5 rounded-lg mb-[10px]">
        <span className="text-2xl">
          <BiBulb className="text-primary" />{" "}
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-700">Optional Section</p>
          <p className="text-xs text-slate-400 mt-0.5">
            You can skip this and add it later in your dashboard.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onSkip}>
          Skip now
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-[20px] mt-[10px]">
        <span className="text-sm font-bold text-slate-500">Units:</span>
        <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
          {["metric", "imperial"].map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u as any)}
              className={`px-4 py-2 rounded text-xs font-bold  transition-all ${unit === u ? "bg-white text-primary shadow-none" : "text-slate-400"}`}
            >
              {u === "metric" ? "cm / kg" : "in / lbs"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Input
          label={`Height (${unit === "metric" ? "cm" : "in"})`}
          type="number"
          value={formData.heightCm || ""}
          placeholder="e.g. 175"
          onChange={(e) => updateData("heightCm", e.target.value)}
        />
        <Input
          label={`Weight (${unit === "metric" ? "kg" : "lb"})`}
          type="number"
          value={formData.weightKg || ""}
          placeholder="e.g. 70"
          onChange={(e) => updateData("weightKg", e.target.value)}
        />
        <div className="space-y-2">
          <h1 className="block text-sm font-bold text-slate-700">BMI (auto)</h1>
          <div
            className={`px-5 py-4 rounded-xl flex items-center justify-between transition-all duration-500 min-h-[54px] ${bmiCategory ? bmiCategory.color + " shadow-inner" : "bg-slate-50 border-2 border-slate-100"}`}
          >
            <div className="flex flex-col">
              <span className="text-3xl font-bold tracking-tighter leading-none">
                {bmi || "—"}
              </span>
            </div>
            {bmiCategory && (
              <div className="px-4 py-2  border border-white/40">
                <span className="text-xs font-bold  tracking-normal">
                  {bmiCategory.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gender & Blood Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
        <div className="space-y-4">
          <h1 className="block text-sm font-bold text-slate-700">
            Biological Gender
          </h1>
          <div className="flex flex-wrap gap-2">
            {genders.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => updateData("gender", g)}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all border-2 ${
                  formData.gender === g
                    ? "bg-primary border-primary text-white "
                    : "bg-white border-slate-100 text-slate-500 "
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="block text-sm font-bold text-slate-700">Blood Type</h1>
          <div className="grid grid-cols-5 gap-2">
            {bloodTypes.map((bt) => (
              <button
                key={bt}
                type="button"
                onClick={() => updateData("bloodType", bt)}
                className={`h-10 rounded-lg text-sm font-semibold transition-all border-2 flex items-center justify-center ${
                  formData.bloodType === bt
                    ? "bg-rose-500 border-rose-500 text-white "
                    : "bg-white border-slate-100 text-slate-500 "
                }`}
              >
                {bt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Level */}
      <div className="space-y-4 py-4">
        <h1 className="block text-sm font-bold text-slate-700">
          Typical Activity Level
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {activityLevels.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => updateData("activityLevel", level)}
              className={`px-4 py-4 rounded-xl text-left text-sm font-semibold transition-all border-2 flex items-center justify-between group ${
                formData.activityLevel === level
                  ? "bg-primary border-primary text-white "
                  : "bg-white border-slate-100 text-slate-400 "
              }`}
            >
              <span className="flex-1">{level}</span>
              <div
                className={`w-2 h-2 rounded-full ${formData.activityLevel === level ? "bg-white" : "bg-slate-200 group-hover:bg-emerald-200"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 py-5">
        <h1
          style={{ marginBottom: "20px" }}
          className="block text-sm font-bold text-slate-700"
        >
          Known Allergies{" "}
          <span className="text-slate-400 font-normal ml-1">
            (Select all that apply)
          </span>
        </h1>
        <div className="flex flex-wrap gap-2.5">
          {commonAllergies.map((allergy) => {
            const isSelected = (formData.allergies || []).includes(allergy);
            return (
              <button
                key={allergy}
                type="button"
                onClick={() => {
                  const current = formData.allergies || [];
                  const next = isSelected
                    ? current.filter((a: string) => a !== allergy)
                    : [...current, allergy];
                  updateData("allergies", next);
                }}
                className={`px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 border-2 ${
                  isSelected
                    ? "bg-primary border-primary text-white "
                    : "bg-white border-slate-100 text-slate-400 "
                }`}
              >
                {allergy}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 mb-[20px]">
        <h1 className="block text-sm font-bold text-slate-700 mb-[20px]">
          Chronic Conditions{" "}
          <span className="text-slate-400 font-normal ml-1">
            (Select all that apply)
          </span>
        </h1>
        <div className="flex flex-wrap gap-2.5">
          {commonConditions.map((condition) => {
            const isSelected = (formData.chronicConditions || []).includes(
              condition,
            );
            return (
              <button
                key={condition}
                type="button"
                onClick={() => {
                  const current = formData.chronicConditions || [];
                  const next = isSelected
                    ? current.filter((c: string) => c !== condition)
                    : [...current, condition];
                  updateData("chronicConditions", next);
                }}
                className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 border-2 ${
                  isSelected
                    ? "bg-primary border-primary text-white "
                    : "bg-white border-slate-100 text-slate-400 "
                }`}
              >
                {condition}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Step 4 – Payment Setup
// ─────────────────────────────────────────
export function PatientPaymentStep({ formData, updateData }: any) {
  const benefits = [
    "24/7 Unlimited Virtual Consultations",
    "Digital Prescriptions & Sick Notes",
    "Secure PHI Health Vault Storage",
    "Direct Specialist Referral Access",
  ];

  return (
    <div className="space-y-10 animate-in slide-in-from-right-6 duration-500">
      {/* Premium Subscription Card */}
      <div className="relative overflow-hidden bg-primary text-white rounded-lg p-8 mb-[20px] border border-white/10 group transition-all">
        <div className="absolute top-[10%] right-[5%] p-8 opacity-100 group-hover:rotate-3 transition-transform duration-1000 pointer-events-none">
          <Image
            src="/auth-doctor.png"
            alt="Doctor"
            width={150}
            height={150}
            className="w-[150px] h-auto object-contain"
          />
        </div>

        <div className="relative ">
          <div className="flex justify-between items-start mb-8">
            <div className="mb-[20px]">
              <span className="text-lg font-semibold text-tertiary flex-wrap text-white mb-[20px] block">
                DigiHealth Pro
              </span>
              <div className="text-right flex items-end">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-secondary">R</span>
                  <span className="text-5xl font-bold tracking-tighter">
                    250
                  </span>
                </div>
                <span className="text-[20px] font-semibold  text-white/50">
                  /month
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <BiSolidCheckCircle className="text-secondary shrink-0" />
                <span className="text-xs font-semibold text-white/90">
                  {benefit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card Payment Form */}
      <div className="bg-white rounded-sm gap-6  py-5 flex flex-col">
        <div className="flex items-center justify-between mb-[20px]">
          <h3 className="text-lg font-bold text-slate-800   flex items-center gap-2 font-grotesk">
            <BiCreditCard className="text-primary" /> Credit or Debit Card
          </h3>
          <div className="flex gap-2">
            <div className="w-8 h-5 bg-slate-100 rounded-sm opacity-50" />
            <div className="w-8 h-5 bg-slate-200 rounded-sm opacity-50" />
          </div>
        </div>

        <div className="">
          <div className="grid grid-cols-2 gap-6 mb-[10px]">
            <Input
              label="Name on Card"
              placeholder="e.g. THABO MOKOENA"
              value={formData.cardName || ""}
              onChange={(e: any) => updateData("cardName", e.target.value.to())}
            />

            <Input
              label="Card Number"
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              value={formData.cardNumber || ""}
              onChange={(e: any) => {
                const val = e.target.value
                  .replace(/\W/gi, "")
                  .replace(/(.{4})/g, "$1 ")
                  .trim();
                updateData("cardNumber", val);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Input
              label="Expiry Date"
              placeholder="MM/YY"
              maxLength={5}
              value={formData.cardExpiry || ""}
              onChange={(e: any) => {
                let val = e.target.value.replace(/\D/g, "");
                if (val.length > 2)
                  val = val.substring(0, 2) + "/" + val.substring(2);
                updateData("cardExpiry", val);
              }}
            />
            <Input
              label="CVV / CVC"
              placeholder="000"
              maxLength={3}
              type="password"
              value={formData.cardCvv || ""}
              onChange={(e: any) =>
                updateData("cardCvv", e.target.value.replace(/\D/g, ""))
              }
            />
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-50 py-5">
          <p className="text-xs font-semibold text-slate-400 leading-relaxed flex items-center gap-2">
            <BiShieldQuarter className="text-green-500" />
            Your payment info is secured via 256-bit AES encryption. We do not
            store your full card number on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Step 5 – Emergency & Photo
// ─────────────────────────────────────────
export function PatientEmergencyStep({ formData, updateData, onSkip }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="flex items-start gap-4 p-5 rounded-lg py-5">
        <span className="text-2xl text-primary">
          <BiSolidUserPlus />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-700">Emergency & Photo</p>
          <p className="text-xs text-slate-400 mt-0.5">
            This information is vital for your safety.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onSkip}>
          Skip now
        </Button>
      </div>

      <div className="p-5 mb-[20px] rounded-lg border border-slate-100 space-y-6">
        <h3 className="text-lg font-bold text-slate-700  tracking-normal font-grotesk">
          Contact Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Emergency Contact Name"
            value={formData.emergencyName || ""}
            onChange={(e) => updateData("emergencyName", e.target.value)}
            placeholder="Name & Surname"
          />
          <Input
            label="Emergency Contact Phone"
            value={formData.emergencyPhone || ""}
            onChange={(e) => updateData("emergencyPhone", e.target.value)}
            placeholder="+27 00 000 0000"
          />
        </div>
      </div>
      <div className="p-5 mb-[20px] bg-primary/5 rounded-lg">
        <p className="text-sm font-bold text-primary leading-relaxed">
          By clicking finish, you confirm all provided information is accurate
          to the best of your knowledge. Your registration will be processed
          immediately.
        </p>
      </div>

      <Button variant="dashed" fullWidth onClick={onSkip}>
        Complete Emergency Info Later
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────
// Step 6 – Document Uploads
// ─────────────────────────────────────────
export function PatientDocumentStep({ formData, updateData }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">
          Documents & Verification
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <CloudinaryUpload
          label="Profile Photo / ID Photo *"
          description="Upload a clear photo of yourself or your ID card"
          value={formData.profilePhoto}
          onUploadComplete={(url) => updateData("profilePhoto", url)}
        />

        <CloudinaryUpload
          label="Medical Certificates / Documents"
          description="Upload any relevant medical certificates or health records (PDF or Images)"
          value={formData.medicalDocument}
          onUploadComplete={(url) => updateData("medicalDocument", url)}
        />
      </div>

      <div className="p-5 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs text-gray-700 font-medium leading-relaxed">
          <strong>Note:</strong> These documents help our medical team provide
          better care. All documents are stored securely and encrypted.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Step 7 – Password Creation (Final Step)
// ─────────────────────────────────────────
export function PasswordCreationStep({ formData, updateData, errors }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500">
      <div className="bg-primary/5 p-8 rounded-2xl border border-primary/10">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white mb-6">
          <BiLockAlt size={24} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2 font-grotesk">
          {" "}
          Secure Your Account
        </h3>
        <p className="text-sm text-slate-500 mb-8">
          Create a strong password to protect your health data and access your
          profile.
        </p>

        <div className="space-y-6">
          <Input
            label="Password *"
            type="password"
            placeholder="At least 8 characters"
            value={formData.password || ""}
            error={errors?.password}
            onChange={(e) => updateData("password", e.target.value)}
          />
          <Input
            label="Confirm Password *"
            type="password"
            placeholder="Repeat your password"
            value={formData.confirmPassword || ""}
            error={errors?.confirmPassword}
            onChange={(e) => updateData("confirmPassword", e.target.value)}
          />
        </div>

        <div className="mt-8 space-y-3">
          <p className="text-xs font-bold text-slate-400 -widest">
            Password Requirements:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "Minimum 8 characters",
              "At least one uppercase letter",
              "At least one number",
              "At least one special character",
            ].map((req, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-xs text-slate-500 font-medium"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                {req}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
