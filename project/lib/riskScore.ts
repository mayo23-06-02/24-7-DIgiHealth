/**
 * Clinical risk score bands (0–100).
 * 0–35 green · 36–50 mild gray · 51–75 orange · 76–100 red
 */

export type RiskBand = "green" | "gray" | "orange" | "red";

export interface RiskBandStyle {
  band: RiskBand;
  label: string;
  /** Solid card background */
  bg: string;
  /** Tailwind bg class for solid cards */
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeClass: string;
}

export function clampRiskScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function riskBandFromScore(score: number): RiskBand {
  const s = clampRiskScore(score);
  if (s <= 35) return "green";
  if (s <= 50) return "gray";
  if (s <= 75) return "orange";
  return "red";
}

export function riskBandStyle(score: number): RiskBandStyle {
  const band = riskBandFromScore(score);
  switch (band) {
    case "green":
      return {
        band,
        label: "Low risk",
        bg: "#16a34a",
        bgClass: "bg-emerald-600",
        textClass: "text-white",
        borderClass: "border-emerald-500",
        badgeClass: "bg-emerald-600 text-white border-emerald-500",
      };
    case "gray":
      return {
        band,
        label: "Mild risk",
        bg: "#6b7280",
        bgClass: "bg-slate-500",
        textClass: "text-white",
        borderClass: "border-slate-400",
        badgeClass: "bg-slate-500 text-white border-slate-400",
      };
    case "orange":
      return {
        band,
        label: "Moderate risk",
        bg: "#ea580c",
        bgClass: "bg-orange-600",
        textClass: "text-white",
        borderClass: "border-orange-500",
        badgeClass: "bg-orange-600 text-white border-orange-500",
      };
    case "red":
      return {
        band,
        label: "High risk",
        bg: "#dc2626",
        bgClass: "bg-red-600",
        textClass: "text-white",
        borderClass: "border-red-500",
        badgeClass: "bg-red-600 text-white border-red-500",
      };
  }
}

/** Map new bands to legacy green/gray/red where schemas only allow 3 colors */
export function legacyRiskColor(score: number): "green" | "gray" | "red" {
  const band = riskBandFromScore(score);
  if (band === "orange") return "gray";
  return band;
}

export function calcAge(dateOfBirth?: string | Date | null): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}
