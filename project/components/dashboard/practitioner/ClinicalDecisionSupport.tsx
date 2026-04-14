'use client';

import React, { useState } from 'react';
import {
  BiShield,
  BiPulse,
  BiInfoCircle,
  BiChevronDown,
  BiChevronUp,
  BiLinkExternal,
  BiSearch,
  BiCheckCircle,
} from 'react-icons/bi';

interface DrugInteractionResult {
  drug1: string;
  drug2: string;
  severity: 'major' | 'moderate' | 'minor';
  description: string;
}

const MOCK_GUIDELINES = [
  {
    id: 'htn',
    title: 'Hypertension Management (JNC 8)',
    category: 'Cardiology',
    summary: 'Target BP <140/90 mmHg for adults. For diabetics and CKD patients, target <130/80 mmHg.',
    steps: [
      'First-line: Thiazide diuretics, CCB, ACE inhibitors or ARBs',
      'Black patients: prefer thiazide or CCB',
      'Avoid beta-blockers as first line (unless concurrent CAD)',
      'Reassess BP control within 4 weeks of initiation',
    ],
    link: 'https://www.samrc.ac.za',
  },
  {
    id: 'dm2',
    title: 'Type 2 Diabetes Management',
    category: 'Endocrinology',
    summary: 'HbA1c target <7% for most patients. Individualise based on age, comorbidities, hypoglycaemia risk.',
    steps: [
      'First-line: Metformin (if eGFR ≥30)',
      'Add SGLT2i or GLP-1 RA if CV or renal disease',
      'Monitor HbA1c every 3 months until stable, then 6-monthly',
      'Annual foot check, retinal screening, urine microalbumin',
    ],
    link: 'https://www.semdsa.org.za',
  },
  {
    id: 'copd',
    title: 'COPD GOLD Guidelines 2025',
    category: 'Pulmonology',
    summary: 'Assess airflow limitation by spirometry. Use GOLD ABCD grading for treatment escalation.',
    steps: [
      'GOLD A: Short-acting bronchodilator PRN',
      'GOLD B: LAMA or LABA',
      'GOLD E: LAMA + LABA ± ICS',
      'Vaccinate: Influenza, Pneumococcal, COVID-19',
    ],
    link: 'https://goldcopd.org',
  },
  {
    id: 'hiv',
    title: 'HIV ART South Africa (NDOH 2024)',
    category: 'Infectious Disease',
    summary: 'Treat all HIV-positive patients regardless of CD4 count. Target undetectable VL (<50 copies/ml).',
    steps: [
      'First-line: TLD (Tenofovir + Lamivudine + Dolutegravir)',
      'VL monitoring at 6 months then annually',
      'TB screening at every visit (4-symptom screen)',
      'Annual Pap smear for women',
    ],
    link: 'https://www.health.gov.za',
  },
];

const DRUG_INTERACTIONS_DB: DrugInteractionResult[] = [
  { drug1: 'Warfarin', drug2: 'Aspirin', severity: 'major', description: 'Significantly increases bleeding risk. Avoid combination or monitor INR closely.' },
  { drug1: 'Metformin', drug2: 'Alcohol', severity: 'major', description: 'Increased risk of lactic acidosis. Advise complete alcohol avoidance.' },
  { drug1: 'Atorvastatin', drug2: 'Amiodarone', severity: 'moderate', description: 'Increased statin levels → myopathy risk. Limit atorvastatin to 40mg/day.' },
  { drug1: 'Amlodipine', drug2: 'Simvastatin', severity: 'moderate', description: 'Simvastatin levels increased. Use ≤20mg simvastatin or switch to atorvastatin.' },
  { drug1: 'Ramipril', drug2: 'Spironolactone', severity: 'moderate', description: 'Additive hyperkalaemia risk. Monitor potassium and renal function closely.' },
  { drug1: 'Dolutegravir', drug2: 'Metformin', severity: 'moderate', description: 'Dolutegravir increases metformin plasma levels. Monitor for metformin toxicity.' },
  { drug1: 'Bisoprolol', drug2: 'Verapamil', severity: 'major', description: 'Risk of severe bradycardia and heart block. Avoid combination.' },
  { drug1: 'Sertraline', drug2: 'Tramadol', severity: 'major', description: 'Serotonin syndrome risk. Avoid or use with extreme caution.' },
];

function checkInteraction(drug1: string, drug2: string): DrugInteractionResult | null {
  const d1 = drug1.trim().toLowerCase();
  const d2 = drug2.trim().toLowerCase();
  return DRUG_INTERACTIONS_DB.find(
    (r) =>
      (r.drug1.toLowerCase().includes(d1) && r.drug2.toLowerCase().includes(d2)) ||
      (r.drug1.toLowerCase().includes(d2) && r.drug2.toLowerCase().includes(d1)),
  ) || null;
}

const severityConfig = {
  major: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '⛔ Major' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: '⚠️ Moderate' },
  minor: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'ℹ️ Minor' },
};

export default function ClinicalDecisionSupport() {
  const [expandedGuideline, setExpandedGuideline] = useState<string | null>(null);
  const [drug1, setDrug1] = useState('');
  const [drug2, setDrug2] = useState('');
  const [interactionResult, setInteractionResult] = useState<DrugInteractionResult | null | 'none' | 'empty'>(null);

  const handleCheckInteraction = () => {
    if (!drug1.trim() || !drug2.trim()) { setInteractionResult('empty'); return; }
    const result = checkInteraction(drug1, drug2);
    setInteractionResult(result || 'none');
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-[#0052CC] to-[#00A3BF] rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
          <BiShield className="text-white text-lg" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm leading-tight">Clinical Decision Support</h3>
          <p className="text-[10px] text-slate-400 font-medium">Drug checker · Guidelines · Protocols</p>
        </div>
      </div>

      {/* Drug Interaction Checker */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <BiPulse className="text-[#0052CC] text-base" />
          <h4 className="text-sm font-bold text-slate-700">Drug Interaction Checker</h4>
        </div>

        <div className="space-y-2 mb-3">
          <input
            type="text"
            value={drug1}
            onChange={(e) => setDrug1(e.target.value)}
            placeholder="Drug 1 (e.g. Warfarin)"
            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-300 outline-none focus:border-[#0052CC]/40 focus:bg-white transition-all"
          />
          <input
            type="text"
            value={drug2}
            onChange={(e) => setDrug2(e.target.value)}
            placeholder="Drug 2 (e.g. Aspirin)"
            onKeyDown={(e) => e.key === 'Enter' && handleCheckInteraction()}
            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-300 outline-none focus:border-[#0052CC]/40 focus:bg-white transition-all"
          />
          <button
            onClick={handleCheckInteraction}
            className="w-full py-2 bg-[#0052CC] hover:bg-[#0047B3] active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <BiSearch size={14} />
            Check Interaction
          </button>
        </div>

        {/* Result */}
        {interactionResult === 'empty' && (
          <p className="text-xs text-slate-400 text-center">Enter both drug names to check.</p>
        )}
        {interactionResult === 'none' && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <BiCheckCircle className="text-emerald-600 text-base shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-700">No known interactions found</p>
              <p className="text-[10px] text-emerald-600">Always verify with clinical pharmacist.</p>
            </div>
          </div>
        )}
        {interactionResult && interactionResult !== 'none' && interactionResult !== 'empty' && (
          <div className={`border rounded-xl p-3 ${severityConfig[interactionResult.severity].bg} ${severityConfig[interactionResult.severity].border}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-black uppercase tracking-wider ${severityConfig[interactionResult.severity].text}`}>
                {severityConfig[interactionResult.severity].label}
              </span>
            </div>
            <p className={`text-xs font-medium ${severityConfig[interactionResult.severity].text}`}>
              {interactionResult.drug1} + {interactionResult.drug2}
            </p>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{interactionResult.description}</p>
          </div>
        )}

        {/* Quick checks */}
        <p className="text-[10px] text-slate-400 mt-3 font-medium">Quick checks:</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {['Warfarin + Aspirin', 'Metformin + Alcohol', 'Bisoprolol + Verapamil'].map((pair) => (
            <button
              key={pair}
              onClick={() => {
                const [d1, d2] = pair.split(' + ');
                setDrug1(d1); setDrug2(d2);
                setInteractionResult(checkInteraction(d1, d2) || 'none');
              }}
              className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-[#0052CC]/10 text-slate-500 hover:text-[#0052CC] rounded-full transition-colors"
            >
              {pair}
            </button>
          ))}
        </div>
      </div>

      {/* Guidelines */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <BiInfoCircle className="text-[#00A3BF] text-base" />
          <h4 className="text-sm font-bold text-slate-700">Clinical Guidelines</h4>
        </div>
        <div className="space-y-2">
          {MOCK_GUIDELINES.map((g) => {
            const isOpen = expandedGuideline === g.id;
            return (
              <div
                key={g.id}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300"
              >
                <button
                  onClick={() => setExpandedGuideline(isOpen ? null : g.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-tight">{g.title}</p>
                    <span className="text-[10px] text-[#00A3BF] font-semibold">{g.category}</span>
                  </div>
                  {isOpen ? (
                    <BiChevronUp className="text-slate-400 text-base shrink-0" />
                  ) : (
                    <BiChevronDown className="text-slate-400 text-base shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 border-t border-slate-100">
                    <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{g.summary}</p>
                    <ul className="mt-2 space-y-1">
                      {g.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-slate-500">
                          <span className="text-[#0052CC] font-bold shrink-0 mt-0.5">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                    <a
                      href={g.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#0052CC] font-bold hover:underline"
                    >
                      Full Guidelines <BiLinkExternal size={11} />
                    </a>
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
