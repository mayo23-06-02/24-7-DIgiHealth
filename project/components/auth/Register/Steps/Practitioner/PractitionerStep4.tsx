"use client";
import React from "react";
import { SETTLEMENT_CONFIRMATION_TEXT } from "./settlementText";

const RESPONSIBILITIES = [
  "setting and maintaining their own consultation or service fees, where applicable;",
  "ensuring that all banking and merchant account information remains current;",
  "complying with applicable tax, accounting and regulatory obligations;",
  "managing refunds, reversals or payment disputes;",
  "notifying 24/7 Digi-Health promptly of any changes to authorised banking or merchant account details.",
];

/** Practitioner registration: Payments & Settlements terms and confirmation. */
export default function PractitionerStep4({ formData, updateData, errors }: any) {
  const accepted = !!formData.settlementTermsAccepted;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">Payments &amp; Settlements</span>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-5 md:p-6 text-sm leading-relaxed text-slate-700">
        <h3 className="font-grotesk text-base font-bold text-slate-900">Patient Payments and Settlement</h3>
        <p>
          24/7 Digi-Health provides access to an integrated payment gateway to facilitate secure payments by patients
          for consultations provided through the platform.
        </p>
        <p>
          All successfully processed payments will be settled directly into the merchant account registered in the
          name of the Practitioner or Medical Facility, subject to the payment service provider&rsquo;s verification,
          settlement timelines, transaction rules and applicable fees.
        </p>
        <p>
          The Practitioner or Medical Facility is responsible for ensuring that the merchant account and banking
          information submitted during registration is accurate, valid and authorised for the receipt of patient
          payments.
        </p>
        <p>
          24/7 Digi-Health facilitates the digital payment process through its integrated payment gateway with Card Not
          Present payment instruments and does not hold patient funds on behalf of the Practitioner or Medical Facility
          unless expressly stated otherwise in a separate written agreement.
        </p>
        <div>
          <p className="font-semibold text-slate-900">Practitioners and Medical Facilities remain responsible for:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {RESPONSIBILITIES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <p>
          By continuing with registration, the Practitioner or authorised representative of the Medical Facility
          acknowledges that patient payments processed through the platform will be directed for settlement to the
          verified merchant account linked to their registered profile.
        </p>
      </div>

      <label
        className={`flex items-start gap-4 p-6 rounded-lg border-2 cursor-pointer transition-all ${
          accepted ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50"
        }`}
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => updateData("settlementTermsAccepted", e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-primary shrink-0"
        />
        <span className="text-sm font-bold text-slate-700 leading-relaxed">{SETTLEMENT_CONFIRMATION_TEXT}</span>
      </label>
      {errors?.settlementTermsAccepted && (
        <p className="text-xs font-bold text-red-500">{errors.settlementTermsAccepted}</p>
      )}
    </div>
  );
}
