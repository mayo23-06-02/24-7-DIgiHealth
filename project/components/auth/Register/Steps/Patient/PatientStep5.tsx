"use client";
import React from "react";
import Link from "next/link";

export default function PatientStep5({ formData, updateData, errors }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500 flex flex-col">
      <div className="bg-primary rounded-md p-8 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-2xl" />
        <h3 className="text-xs text-white/60 mb-4 font-grotesk">
          Legal Compliance
        </h3>
        <h2 className="text-3xl font-bold mb-5 leading-tight font-grotesk">
          Privacy Declaration
        </h2>
        <p className="text-white/80 text-sm mb-8">
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
        className={`flex items-start gap-5 p-8 rounded-md cursor-pointer transition-all duration-300 ${
          formData.consent
            ? "border-primary bg-primary/5"
            : "border-slate-100 bg-slate-50 hover:border-primary/30"
        }`}
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
      {errors?.consent && (
        <p className="text-xs text-red-500 font-medium">{errors.consent}</p>
      )}

      <label
        htmlFor="terms-consent"
        className={`flex items-start gap-5 p-8 rounded-md cursor-pointer transition-all duration-300 ${
          formData.termsAccepted
            ? "border-primary bg-primary/5"
            : "border-slate-100 bg-slate-50 hover:border-primary/30"
        }`}
      >
        <input
          id="terms-consent"
          type="checkbox"
          checked={formData.termsAccepted || false}
          onChange={(e) => updateData("termsAccepted", e.target.checked)}
          className="mt-0.5 w-6 h-6 rounded text-primary focus:ring-primary border-slate-300 accent-primary shrink-0"
        />
        <span className="text-sm font-bold text-slate-700 leading-relaxed">
          I have read and agree to the{" "}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline decoration-2 underline-offset-4"
          >
            Terms and Conditions
          </Link>
          .
        </span>
      </label>
      {errors?.termsAccepted && (
        <p className="text-xs text-red-500 font-medium">
          {errors.termsAccepted}
        </p>
      )}
    </div>
  );
}
