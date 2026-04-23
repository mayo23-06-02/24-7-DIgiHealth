"use client";
import React, { useState } from "react";
import {
  FiFileText,
  FiChevronDown,
  FiChevronUp,
  FiActivity,
  FiEyeOff,
} from "react-icons/fi";

export default function HealthSummary({
  visits,
  prescriptions,
}: {
  visits: any[];
  prescriptions: any[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-grotesk">
          <FiActivity className="text-high-vis-red" /> Health Summary
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-trust-blue hover:bg-slate-100 transition-colors"
        >
          {expanded ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      <div className="space-y-6">
        {/* Recent Visits */}
        <div>
          <h4 className="text-sm font-bold text-slate-500  tracking-normal mb-3 font-grotesk">
            Recent Consultations
          </h4>
          {(expanded ? visits : visits.slice(0, 1)).map((v: any, i: number) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-slate-50 mb-3 border border-slate-100"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-trust-blue">{v.doctor}</span>
                <span className="text-sm font-semibold bg-white px-2 py-1 rounded-md text-slate-600 shadow-none">
                  {v.date}
                </span>
              </div>
              <p className="text-slate-600 text-sm font-medium">
                {expanded
                  ? v.summary
                  : "Clinical notes are masked for privacy. Expand to view summary."}
              </p>
            </div>
          ))}
        </div>

        {/* Prescriptions */}
        <div className={expanded ? "block" : "hidden"}>
          <h4 className="text-sm font-bold text-slate-500  tracking-normal mb-3 font-grotesk">
            Active Prescriptions
          </h4>
          {prescriptions.map((p: any, i: number) => (
            <div
              key={i}
              className="flex justify-between items-center p-4 rounded-2xl border border-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-supportive-teal/10 flex items-center justify-center text-supportive-teal">
                  <FiFileText />
                </div>
                <span className="font-bold text-slate-800">{p.medication}</span>
              </div>
              <div className="text-right">
                <span className="block text-sm font-bold text-slate-500">
                  Refills
                </span>
                <span className="font-bold text-slate-800">{p.refills}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="mt-6 w-full py-4 border-2 border-slate-200 text-slate-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-trust-blue hover:border-trust-blue/30 transition-all">
        <FiEyeOff /> View Complete Record (Requires MFA)
      </button>
    </div>
  );
}
