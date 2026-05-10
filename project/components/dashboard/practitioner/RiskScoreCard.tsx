"use client";

import React from "react";

interface RiskScoreCardProps {
  score: number;
  color: "green" | "gray" | "red";
  factors?: string[];
  size?: "sm" | "md" | "lg";
  showRing?: boolean;
}

const colorMap = {
  green: {
    ring: "#22c55e",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "Low Risk",
    glow: "shadow-emerald-200",
    track: "#dcfce7",
  },
  gray: {
    ring: "#f59e0b",
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
    label: "Moderate",
    glow: "shadow-gray-200",
    track: "#fef3c7",
  },
  red: {
    ring: "#ef4444",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    label: "High Risk",
    glow: "shadow-red-200",
    track: "#fee2e2",
  },
};

export default function RiskScoreCard({
  score,
  color,
  factors = [],
  size = "md",
  showRing = true,
}: RiskScoreCardProps) {
  const c = colorMap[color] || colorMap.green;
  const radius = size === "sm" ? 20 : size === "lg" ? 36 : 28;
  const strokeWidth = size === "sm" ? 4 : 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const svgSize = (radius + strokeWidth + 2) * 2;
  const textSize =
    size === "sm" ? "text-xs" : size === "lg" ? "text-2xl" : "text-base";

  return (
    <div className="relative group">
      <div
        className={`
          inline-flex items-center gap-2 px-2 py-1 rounded-full border font-semibold
          ${c.bg} ${c.text} ${c.border}
          ${size === "sm" ? "text-xs" : "text-sm"}
          cursor-default transition-all duration-200
          hover: ${c.glow}
        `}
      >
        {showRing && (
          <svg
            width={svgSize}
            height={svgSize}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            className="rotate-[-90deg]"
          >
            {/* Track */}
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={radius}
              fill="none"
              stroke={c.track}
              strokeWidth={strokeWidth}
            />
            {/* Progress */}
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={radius}
              fill="none"
              stroke={c.ring}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-[0.8s] ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
          </svg>
        )}
        <span className={`font-bold ${textSize}`}>{score}</span>
        {size !== "sm" && (
          <span className="opacity-70 font-medium">{c.label}</span>
        )}
      </div>

      {/* Tooltip */}
      {factors.length > 0 && (
        <div
          className="
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50
            bg-slate-900 text-white text-xs rounded-2xl p-3 
            opacity-0 group-hover:opacity-100 pointer-events-none
            transition-all duration-300 scale-95 group-hover:scale-100
            origin-bottom
          "
        >
          <p className="font-bold text-slate-300 mb-2  tracking-wide text-xs">
            Risk Factors
          </p>
          <ul className="space-y-1">
            {factors.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5 shrink-0">•</span>
                <span className="text-slate-200 leading-tight">{f}</span>
              </li>
            ))}
          </ul>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}
