"use client";

import React from "react";
import Button from "@/components/ui/Button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { VitalsDataPoint } from "./types";

interface VitalsTabProps {
  vitals: VitalsDataPoint[];
  selectedVital: "weight" | "bp" | "heartRate";
  onSelectVital: (v: "weight" | "bp" | "heartRate") => void;
}

export default function VitalsTab({
  vitals,
  selectedVital,
  onSelectVital,
}: VitalsTabProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-8 animate-dissolve">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h3 className="text-xl font-bold text-slate-800 font-grotesk">
            Biometric Trends
          </h3>
          <p className="text-sm text-slate-500">
            Historical observations from clinical visits
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {(
            [
              { id: "weight", label: "Weight" },
              { id: "bp", label: "Blood Pressure" },
              { id: "heartRate", label: "Heart Rate" },
            ] as const
          ).map((v) => (
            <Button
              key={v.id}
              onClick={() => onSelectVital(v.id)}
              variant={selectedVital === v.id ? "white" : "ghost"}
              className={`!px-4 !py-2 !h-auto !min-w-0 rounded-lg text-xs font-bold transition-all border-none ${
                selectedVital === v.id
                  ? "text-primary shadow-none"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {v.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={vitals}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
            />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "none" }} />
            {selectedVital === "weight" && (
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#4493b8"
                strokeWidth={4}
                dot={{ r: 6, fill: "#4493b8", strokeWidth: 3, stroke: "#fff" }}
                activeDot={{ r: 8 }}
              />
            )}
            {selectedVital === "bp" && (
              <>
                <Line
                  type="monotone"
                  dataKey="systolicBP"
                  stroke="#E03A3A"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Systolic"
                />
                <Line
                  type="monotone"
                  dataKey="diastolicBP"
                  stroke="#53CBF3"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Diastolic"
                />
              </>
            )}
            {selectedVital === "heartRate" && (
              <Line
                type="monotone"
                dataKey="heartRate"
                stroke="#FFDE42"
                strokeWidth={4}
                dot={{ r: 6, fill: "#FFDE42", strokeWidth: 3, stroke: "#fff" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
