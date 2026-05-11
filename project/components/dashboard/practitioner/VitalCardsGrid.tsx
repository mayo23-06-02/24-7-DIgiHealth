import React from "react";
import { BiHeart, BiPulse, BiUser, BiDroplet } from "react-icons/bi";
import KPICard from "@/components/ui/KPICard";

interface VitalCardsGridProps {
  onCardClick?: (vital: string) => void;
}

const VitalCardsGrid: React.FC<VitalCardsGridProps> = ({ onCardClick }) => {
  const vitals = [
    {
      id: "heart-rate",
      label: "Heart Rate",
      value: "---",
      unit: "bpm",
      description: "Update required",
      trend: 0,
      icon: <BiHeart size={24} />,
      color: "slate",
    },
    {
      id: "blood-pressure",
      label: "Blood Pressure",
      value: "---/---",
      unit: "",
      description: "Update required",
      trend: 0,
      icon: <BiPulse size={24} />,
      color: "slate",
    },
    {
      id: "body-mass",
      label: "Body Mass",
      value: "70",
      unit: "kg",
      description: "Latest weight",
      trend: 0,
      icon: <BiUser size={24} />,
      color: "slate",
    },
    {
      id: "glucose",
      label: "Glucose",
      value: "0",
      unit: "mmol",
      description: "Update required",
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
