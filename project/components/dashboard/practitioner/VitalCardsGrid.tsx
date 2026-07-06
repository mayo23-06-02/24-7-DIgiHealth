import React from "react";
import { BiHeart, BiPulse, BiUser, BiDroplet } from "react-icons/bi";
import KPICard from "@/components/ui/KPICard";

interface VitalCardsGridProps {
  onCardClick?: (vital: string) => void;
  vitalsData?: {
    heartRate?: number | string;
    bloodPressure?: string;
    weight?: number | string;
    glucose?: number | string;
    dateRecorded?: string | Date;
  };
}

const VitalCardsGrid: React.FC<VitalCardsGridProps> = ({ onCardClick, vitalsData }) => {
  const isUpToDate = vitalsData?.dateRecorded ? true : false;
  
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
      description: vitalsData?.bloodPressure ? "Recent reading" : "Update required",
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
    {
      id: "glucose",
      label: "Glucose",
      value: vitalsData?.glucose || "---",
      unit: "mmol/L",
      description: vitalsData?.glucose ? "Recent reading" : "Update required",
      trend: 0,
      icon: <BiDroplet size={24} />,
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
    </div>
  );
};

export default VitalCardsGrid;
