"use client";
import React, { useState } from "react";
import Input from "@/components/ui/Input";
import { BiPlus } from "react-icons/bi";

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
const activityLevels = [
  "Sedentary (little or no exercise)",
  "Lightly active (1–3×/week)",
  "Moderately active (3-5×/week)",
  "Very active (6-7×/week)",
  "Athlete / Highly active",
];
const defaultAllergies = [
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
const defaultConditions = [
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

// ─── ChipsSelector with custom add ───────────────────────────────────
function ChipsSelector({
  label,
  defaultItems,
  selected,
  onSelect,
  onAddCustom,
}: {
  label: string;
  defaultItems: string[];
  selected: string[];
  onSelect: (value: string) => void;
  onAddCustom: (value: string) => void;
}) {
  const [customValue, setCustomValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // Combine default items + selected items that are not in default
  const allItems = [
    ...defaultItems,
    ...selected.filter((s) => !defaultItems.includes(s)),
  ];

  const handleAdd = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    // If it's already in selected, do nothing; else add it
    if (!selected.includes(trimmed)) {
      onAddCustom(trimmed);
    }
    setCustomValue("");
    setShowCustom(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-slate-700">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="text-xs font-bold text-primary flex items-center gap-1"
        >
          <BiPlus /> Add custom
        </button>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {allItems.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(item)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border-2 ${
                isSelected
                  ? "bg-primary border-primary text-white"
                  : "bg-white border-slate-100 text-slate-500 hover:border-primary/30"
              }`}
            >
              {item}
            </button>
          );
        })}
        {showCustom && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Type custom..."
              className="px-4 py-2 border-2 border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="px-4 py-2 bg-primary text-white rounded-full text-sm font-bold"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Step Component ──────────────────────────────────────────────
export default function PatientStep2({ formData, updateData }: any) {
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

  const handleAllergyToggle = (item: string) => {
    const current = formData.allergies || [];
    const next = current.includes(item)
      ? current.filter((a: string) => a !== item)
      : [...current, item];
    updateData("allergies", next);
  };

  const handleAddAllergy = (custom: string) => {
    const current = formData.allergies || [];
    if (!current.includes(custom)) {
      updateData("allergies", [...current, custom]);
    }
  };

  const handleConditionToggle = (item: string) => {
    const current = formData.chronicConditions || [];
    const next = current.includes(item)
      ? current.filter((c: string) => c !== item)
      : [...current, item];
    updateData("chronicConditions", next);
  };

  const handleAddCondition = (custom: string) => {
    const current = formData.chronicConditions || [];
    if (!current.includes(custom)) {
      updateData("chronicConditions", [...current, custom]);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-500 py-[60px] mb-[30px]">
      <div className="flex items-center gap-3 mb-[20px] mt-[10px]">
        <span className="text-sm font-bold text-slate-500">Units:</span>
        <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
          {["metric", "imperial"].map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u as any)}
              className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                unit === u
                  ? "bg-white text-primary shadow-none"
                  : "text-slate-500"
              }`}
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
            className={`px-5 py-4 rounded-xl flex items-center justify-between transition-all duration-500 min-h-[54px] ${
              bmiCategory
                ? bmiCategory.color + " shadow-inner"
                : "bg-slate-50 border-2 border-slate-100"
            }`}
          >
            <span className="text-3xl font-bold tracking-tighter leading-none">
              {bmi || "—"}
            </span>
            {bmiCategory && (
              <div className="px-4 py-2 border border-white/40">
                <span className="text-xs font-bold tracking-normal">
                  {bmiCategory.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blood Type */}
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
                  ? "bg-rose-500 border-rose-500 text-white"
                  : "bg-white border-slate-100 text-slate-500"
              }`}
            >
              {bt}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Level */}
      <div className="space-y-4">
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
                  ? "bg-primary border-primary text-white"
                  : "bg-white border-slate-100 text-slate-500"
              }`}
            >
              <span className="flex-1">{level}</span>
              <div
                className={`w-2 h-2 rounded-full ${
                  formData.activityLevel === level
                    ? "bg-white"
                    : "bg-slate-200 group-hover:bg-emerald-200"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <ChipsSelector
        label="Known Allergies"
        defaultItems={defaultAllergies}
        selected={formData.allergies || []}
        onSelect={handleAllergyToggle}
        onAddCustom={handleAddAllergy}
      />

      {/* Chronic Conditions */}
      <ChipsSelector
        label="Chronic Conditions"
        defaultItems={defaultConditions}
        selected={formData.chronicConditions || []}
        onSelect={handleConditionToggle}
        onAddCustom={handleAddCondition}
      />
    </div>
  );
}
