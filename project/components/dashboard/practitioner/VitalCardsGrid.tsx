import React from "react";
import { BiHeart, BiPulse, BiUser } from "react-icons/bi";
import KPICard from "@/components/ui/KPICard";
import EditableRiskScoreCard from "./EditableRiskScoreCard";
import type { RiskBand } from "@/lib/riskScore";

interface VitalCardsGridProps {
  onCardClick?: (vital: string) => void;
  patientId?: string;
  riskScore?: number;
  onRiskSaved?: (score: number, band: RiskBand) => void;
  vitalsData?: {
    heartRate?: number | string;
    bloodPressure?: string;
    weight?: number | string;
    glucose?: number | string;
    dateRecorded?: string | Date;
  };
}

const VitalCardsGrid: React.FC<VitalCardsGridProps> = ({
  onCardClick,
  vitalsData,
  patientId,
  riskScore = 0,
  onRiskSaved,
}) => {
  const vitals = [
    {
      id: "heart-rate",
      label: "Heart Rate",
      value: vitalsData?.heartRate || "---",
      unit: "bpm",
      description: vitalsData?.heartRate ? "Recent reading" : "Update required",
      trend: 0,
      icon: <BiHeart size={24} />,
      color: "slate",
    },
    {
      id: "blood-pressure",
      label: "Blood Pressure",
      value: vitalsData?.bloodPressure || "---/---",
      unit: "",
      description: vitalsData?.bloodPressure
        ? "Recent reading"
        : "Update required",
      trend: 0,
      icon: <BiPulse size={24} />,
      color: "slate",
    },
    {
      id: "body-mass",
      label: "Body Mass",
      value: vitalsData?.weight || "---",
      unit: "kg",
      description: vitalsData?.weight ? "Latest weight" : "Update required",
      trend: 0,
      icon: <BiUser size={24} />,
      color: "slate",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {vitals.map((vital) => (
        <KPICard
          key={vital.id}
          label={vital.label}
          value={vital.value}
          unit={vital.unit}
          description={vital.description}
          trend={vital.trend}
          icon={vital.icon}
          color={vital.color}
          onClick={() => onCardClick?.(vital.id)}
        />
      ))}

      {/* Risk score replaces glucose — solid band colour, white text, slider edit */}
      {patientId ? (
        <EditableRiskScoreCard
          patientId={patientId}
          initialScore={riskScore}
          onSaved={onRiskSaved}
        />
      ) : (
        <div className="rounded-2xl bg-slate-500 p-4 min-h-[148px] text-white flex flex-col justify-end">
          <p className="text-3xl font-bold">—</p>
          <p className="text-sm font-semibold text-white/90">Clinical risk score</p>
        </div>
      )}
    </div>
  );
};

export default VitalCardsGrid;
