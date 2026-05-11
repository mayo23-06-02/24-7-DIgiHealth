import React from "react";
import { BiHeart, BiPulse, BiUser, BiDroplet } from "react-icons/bi";
import VitalCard from "./VitalCard";

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
      status: "Update required",
      trend: "0%",
      icon: <BiHeart size={20} />,
    },
    {
      id: "blood-pressure",
      label: "Blood Pressure",
      value: "---/---",
      unit: "",
      status: "Update required",
      trend: "0%",
      icon: <BiPulse size={20} />,
    },
    {
      id: "body-mass",
      label: "Body Mass",
      value: "70",
      unit: "kg",
      status: "Latest weight",
      trend: "0%",
      icon: <BiUser size={20} />,
    },
    {
      id: "glucose",
      label: "Glucose",
      value: "0",
      unit: "mmol",
      status: "Update required",
      trend: "0%",
      icon: <BiDroplet size={20} />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {vitals.map((vital) => (
        <VitalCard
          key={vital.id}
          {...vital}
          onClick={() => onCardClick?.(vital.id)}
        />
      ))}
    </div>
  );
};

export default VitalCardsGrid;
