"use client";

import React, { useState } from "react";
import {
  BiShield,
  BiPulse,
  BiInfoCircle,
  BiChevronDown,
  BiChevronUp,
  BiLinkExternal,
  BiSearch,
  BiCheckCircle,
} from "react-icons/bi";

interface DrugInteractionResult {
  drug1: string;
  drug2: string;
  severity: "major" | "moderate" | "minor";
  description: string;
}

const MOCK_GUIDELINES = [
  {
    id: "htn",
    title: "Hypertension Management (JNC 8)",
    category: "Cardiology",
    summary:
      "Target BP <140/90 mmHg for adults. For diabetics and CKD patients, target <130/80 mmHg.",
    steps: [
      "First-line: Thiazide diuretics, CCB, ACE inhibitors or ARBs",
      "Black patients: prefer thiazide or CCB",
      "Avoid beta-blockers as first line (unless concurrent CAD)",
      "Reassess BP control within 4 weeks of initiation",
    ],
    link: "https://www.samrc.ac.za",
  },
  {
    id: "dm2",
    title: "Type 2 Diabetes Management",
    category: "Endocrinology",
    summary:
      "HbA1c target <7% for most patients. Individualise based on age, comorbidities, hypoglycaemia risk.",
    steps: [
      "First-line: Metformin (if eGFR ≥30)",
      "Add SGLT2i or GLP-1 RA if CV or renal disease",
      "Monitor HbA1c every 3 months until stable, then 6-monthly",
      "Annual foot check, retinal screening, urine microalbumin",
    ],
    link: "https://www.semdsa.org.za",
  },
  {
    id: "copd",
    title: "COPD GOLD Guidelines 2025",
    category: "Pulmonology",
    summary:
      "Assess airflow limitation by spirometry. Use GOLD ABCD grading for treatment escalation.",
    steps: [
      "GOLD A: Short-acting bronchodilator PRN",
      "GOLD B: LAMA or LABA",
      "GOLD E: LAMA + LABA ± ICS",
      "Vaccinate: Influenza, Pneumococcal, COVID-19",
    ],
    link: "https://goldcopd.org",
  },
  {
    id: "hiv",
    title: "HIV ART South Africa (NDOH 2024)",
    category: "Infectious Disease",
    summary:
      "Treat all HIV-positive patients regardless of CD4 count. Target undetectable VL (<50 copies/ml).",
    steps: [
      "First-line: TLD (Tenofovir + Lamivudine + Dolutegravir)",
      "VL monitoring at 6 months then annually",
      "TB screening at every visit (4-symptom screen)",
      "Annual Pap smear for women",
    ],
    link: "https://www.health.gov.za",
  },
];

const DRUG_INTERACTIONS_DB: DrugInteractionResult[] = [
  {
    drug1: "Warfarin",
    drug2: "Aspirin",
    severity: "major",
    description:
      "Significantly increases bleeding risk. Avoid combination or monitor INR closely.",
  },
  {
    drug1: "Metformin",
    drug2: "Alcohol",
    severity: "major",
    description:
      "Increased risk of lactic acidosis. Advise complete alcohol avoidance.",
  },
  {
    drug1: "Atorvastatin",
    drug2: "Amiodarone",
    severity: "moderate",
    description:
      "Increased statin levels → myopathy risk. Limit atorvastatin to 40mg/day.",
  },
  {
    drug1: "Amlodipine",
    drug2: "Simvastatin",
    severity: "moderate",
    description:
      "Simvastatin levels increased. Use ≤20mg simvastatin or switch to atorvastatin.",
  },
  {
    drug1: "Ramipril",
    drug2: "Spironolactone",
    severity: "moderate",
    description:
      "Additive hyperkalaemia risk. Monitor potassium and renal function closely.",
  },
  {
    drug1: "Dolutegravir",
    drug2: "Metformin",
    severity: "moderate",
    description:
      "Dolutegravir increases metformin plasma levels. Monitor for metformin toxicity.",
  },
  {
    drug1: "Bisoprolol",
    drug2: "Verapamil",
    severity: "major",
    description:
      "Risk of severe bradycardia and heart block. Avoid combination.",
  },
  {
    drug1: "Sertraline",
    drug2: "Tramadol",
    severity: "major",
    description: "Serotonin syndrome risk. Avoid or use with extreme caution.",
  },
];

function checkInteraction(
  drug1: string,
  drug2: string,
): DrugInteractionResult | null {
  const d1 = drug1.trim().toLowerCase();
  const d2 = drug2.trim().toLowerCase();
  return (
    DRUG_INTERACTIONS_DB.find(
      (r) =>
        (r.drug1.toLowerCase().includes(d1) &&
          r.drug2.toLowerCase().includes(d2)) ||
        (r.drug1.toLowerCase().includes(d2) &&
          r.drug2.toLowerCase().includes(d1)),
    ) || null
  );
}

const severityConfig = {
  major: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    label: "⛔ Major",
  },
  moderate: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
    label: "⚠️ Moderate",
  },
  minor: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    label: "ℹ️ Minor",
  },
};

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ClinicalDecisionSupport() {
  const [expandedGuideline, setExpandedGuideline] = useState<string | null>(
    null,
  );
  const [drug1, setDrug1] = useState("");
  const [drug2, setDrug2] = useState("");
  const [interactionResult, setInteractionResult] = useState<
    DrugInteractionResult | null | "none" | "empty"
  >(null);

  const handleCheckInteraction = () => {
    if (!drug1.trim() || !drug2.trim()) {
      setInteractionResult("empty");
      return;
    }
    const result = checkInteraction(drug1, drug2);
    setInteractionResult(result || "none");
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center  shadow-primary/20">
          <BiShield className="text-white text-lg" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm leading-tight  tracking-normal font-grotesk">
            Clinical Decision Support
          </h3>
          <p className="text-sm text-slate-500 font-bold  tracking-normal mt-0.5">
            Drug checker · Guidelines · Protocols
          </p>
        </div>
      </div>

      {/* Drug Interaction Checker */}
      <div className="bg-white rounded-lg border border-slate-100 p-6 shadow-none shadow-slate-900/5 shrink-0">
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <BiPulse size={20} />
          </div>
          <h4 className="text-sm font-bold text-slate-500  tracking-normal font-grotesk">
            Precision Drug Interaction Analytics
          </h4>
        </div>

        <div className="space-y-3 mb-6 px-1">
          <Input
            type="text"
            value={drug1}
            onChange={(e) => setDrug1(e.target.value)}
            placeholder="Analytical Subject 1 (e.g. Warfarin)"
            className="rounded-lg border-slate-100 font-bold text-xs"
          />
          <Input
            type="text"
            value={drug2}
            onChange={(e) => setDrug2(e.target.value)}
            placeholder="Analytical Subject 2 (e.g. Aspirin)"
            onKeyDown={(e) => e.key === "Enter" && handleCheckInteraction()}
            className="rounded-lg border-slate-100 font-bold text-xs"
          />
          <Button
            onClick={handleCheckInteraction}
            fullWidth
            className="h-14 bg-primary hover:bg-primary/90 text-white text-[11px] font-bold  tracking-normal rounded-lg transition-all shadow-none shadow-primary/20"
            icon={<BiSearch size={16} />}
          >
            Execute Intelligence Check
          </Button>
        </div>

        {/* Result */}
        {interactionResult === "empty" && (
          <p className="text-sm text-slate-500 text-center font-bold  tracking-normal">
            Enter both drug names to check.
          </p>
        )}
        {interactionResult === "none" && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <BiCheckCircle className="text-emerald-600 text-base shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-700  tracking-normal">
                No known interactions found
              </p>
              <p className="text-[9px] text-emerald-600 font-medium italic opacity-70">
                Always verify with clinical pharmacist.
              </p>
            </div>
          </div>
        )}
        {interactionResult &&
          interactionResult !== "none" &&
          interactionResult !== "empty" && (
            <div
              className={`border rounded-lg p-3 ${severityConfig[interactionResult.severity].bg} ${severityConfig[interactionResult.severity].border}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[9px] font-bold  tracking-normal ${severityConfig[interactionResult.severity].text}`}
                >
                  {severityConfig[interactionResult.severity].label}
                </span>
              </div>
              <p
                className={`text-xs font-bold  tracking-normal ${severityConfig[interactionResult.severity].text}`}
              >
                {interactionResult.drug1} + {interactionResult.drug2}
              </p>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed font-medium">
                {interactionResult.description}
              </p>
            </div>
          )}

        {/* Quick checks */}
        <p className="text-sm text-slate-500 mt-4 font-bold  tracking-normal">
          Quick checks:
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[
            "Warfarin + Aspirin",
            "Metformin + Alcohol",
            "Bisoprolol + Verapamil",
          ].map((pair) => (
            <Button
              key={pair}
              variant="ghost"
              onClick={() => {
                const [d1, d2] = pair.split(" + ");
                setDrug1(d1);
                setDrug2(d2);
                setInteractionResult(checkInteraction(d1, d2) || "none");
              }}
              className="text-[9px] px-3 py-1 bg-slate-100 hover:bg-primary/10 text-slate-500 hover:text-primary rounded-full transition-colors h-auto p-0 border-none !min-w-0 font-bold  tracking-normal"
            >
              {pair}
            </Button>
          ))}
        </div>
      </div>

      {/* Guidelines */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3 mt-2">
          <BiInfoCircle className="text-secondary text-base" />
          <h4 className="text-sm font-bold text-slate-700  tracking-normal font-grotesk">
            Clinical Guidelines
          </h4>
        </div>
        <div className="space-y-3">
          {MOCK_GUIDELINES.map((g) => {
            const isOpen = expandedGuideline === g.id;
            return (
              <div
                key={g.id}
                className={`bg-white rounded-lg border transition-all duration-300 ${isOpen ? "border-primary/20 " : "border-slate-100 shadow-none"}`}
              >
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setExpandedGuideline(isOpen ? null : g.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors h-auto border-none bg-transparent"
                >
                  <div className="min-w-0 pr-4">
                    <p className="text-[11px] font-bold text-slate-800 leading-tight  tracking-normal truncate">
                      {g.title}
                    </p>
                    <span className="text-[9px] text-primary/80 font-bold  tracking-normal mt-1 block">
                      {g.category}
                    </span>
                  </div>
                  {isOpen ? (
                    <BiChevronUp className="text-primary text-base shrink-0" />
                  ) : (
                    <BiChevronDown className="text-slate-500 text-base shrink-0" />
                  )}
                </Button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                    <p className="text-[11px] text-slate-600 mt-3 leading-relaxed font-medium">
                      {g.summary}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {g.steps.map((step, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-slate-500"
                        >
                          <span className="text-primary font-bold shrink-0 mt-0.5">
                            {i + 1}.
                          </span>
                          <span className="font-medium">{step}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="ghost"
                      className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-bold hover:underline p-0 !min-w-0 border-none bg-transparent  tracking-normal h-auto"
                      onClick={() => window.open(g.link, "_blank")}
                    >
                      Full Guidelines <BiLinkExternal size={11} />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
