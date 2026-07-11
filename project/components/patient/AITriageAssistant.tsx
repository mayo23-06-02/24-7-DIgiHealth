"use client";

import React, { useState } from "react";
import {
  BiLoaderCircle,
  BiSearch,
  BiShieldQuarter,
  BiPulse,
  BiX,
} from "react-icons/bi";

interface Diagnosis {
  disease: string;
  snomedId: string;
  confidence: number;
}

export default function AITriageAssistant() {
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDiagnose = async () => {
    if (!symptoms.trim() || !age || !gender) {
      setError("Please fill in all fields (symptoms, age, and gender).");
      return;
    }

    setIsLoading(true);
    setError("");
    setDiagnoses([]);

    try {
      // Parse symptoms string into an array
      const symptomArray = symptoms.split(",").map((s) => s.trim());

      const response = await fetch("/api/ai-diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: symptomArray,
          age: parseInt(age),
          gender: gender,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Diagnosis analysis failed");
      }

      setDiagnoses(data.possibleConditions || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Diagnosis request failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-[40px] shadow-none border border-slate-200 p-8 xl:p-10 relative overflow-hidden group hover: hover:shadow-primary/5 transition-all duration-700">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-[20px] flex items-center justify-center">
            <BiShieldQuarter size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tighter leading-none mb-1 font-grotesk">
              Medius AI Diagnoser
            </h2>
            <p className="text-sm font-bold text-slate-500  tracking-normal">
              Rapid Differential Diagnostics
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="block text-sm font-bold text-slate-700 mb-2">
              Describe Your Symptoms <span className="text-rose-500">*</span>
            </h1>
            <textarea
              rows={3}
              className="w-full border-2 border-slate-100 bg-slate-50 rounded-lg p-4 text-sm font-medium focus:outline-none focus:ring-0 focus:border-primary transition-all resize-none shadow-inner"
              placeholder="e.g., persistent cough, fever, shortness of breath"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h1 className="block text-sm font-bold text-slate-700 mb-2">
                Age
              </h1>
              <input
                type="number"
                className="w-full border-2 border-slate-100 bg-slate-50 rounded-lg p-4 text-sm font-medium focus:outline-none focus:ring-0 focus:border-primary transition-all shadow-inner"
                value={age}
                placeholder="Years"
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div>
              <h1 className="block text-sm font-bold text-slate-700 mb-2">
                Gender
              </h1>
              <select
                className="w-full border-2 border-slate-100 bg-slate-50 rounded-lg p-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-0 focus:border-primary transition-all shadow-inner appearance-none"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select Biological Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-[20px] text-[13px] font-bold shadow-none">
              {error}
            </div>
          )}

          <button
            onClick={handleDiagnose}
            disabled={isLoading}
            className="w-full bg-primary text-white py-4 rounded-lg font-bold  tracking-normal hover:bg-[#0041a3] hover:shadow-none hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            {isLoading ? (
              <BiLoaderCircle className="animate-spin text-xl" />
            ) : (
              <BiSearch className="text-xl" />
            )}
            {isLoading
              ? "Analyzing Clinical Knowledge Graph..."
              : "Execute Differential Diagnosis"}
          </button>

          {diagnoses.length > 0 && (
            <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2 font-grotesk">
                <BiPulse className="text-primary" /> Possible Differential
                Conditions
              </h3>

              <div className="space-y-4">
                {diagnoses.map((dx, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-100 p-4 rounded-lg flex items-center justify-between group hover:border-primary/30 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block text-sm mb-1">
                        {dx.disease}
                      </span>
                      <p className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded inline-block  tracking-wider shadow-none">
                        SNOMED CT: {dx.snomedId}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-2 rounded-full inline-flex items-center">
                        {Math.round(dx.confidence * 100)}% Match
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-xs font-bold text-slate-500 italic text-center p-4 bg-slate-50 rounded-lg">
                ⚠️ <span className="text-slate-500">Clinical Disclaimer:</span>{" "}
                This is an AI-powered preliminary analysis and is not a
                substitute for professional medical advice. Always consult a
                qualified healthcare provider for an accurate diagnosis.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
