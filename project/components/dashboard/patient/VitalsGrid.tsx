import React, { useState, useEffect } from "react";
import { BiPulse, BiPlanet, BiHeart } from "react-icons/bi";
import KPICard from "@/components/ui/KPICard";

export default function VitalsGrid() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/patient/vitals')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const vitals = [
    {
      label: "Heart Rate",
      val: data?.heartRate || "--",
      unit: "BPM",
      icon: <BiPulse size={24} />,
      trend: 2,
      color: "primary",
      description: data?.description || "Syncing...",
    },
    {
      label: "Total Weight",
      val: data?.weight || "--",
      unit: "KG",
      icon: <BiPlanet size={24} />,
      trend: -0.5,
      color: "primary",
      description: "Stable tracking",
    },
    {
      label: "Blood Pressure",
      val: data?.bp || "--/--",
      unit: "mmHg",
      icon: <BiHeart size={24} />,
      trend: 0,
      color: "emerald",
      description: "Clinical grade",
    },
    {
      label: "Blood Oxygen",
      val: data?.spO2 || "--",
      unit: "%",
      icon: <BiPulse size={24} />,
      trend: 0,
      color: "primary",
      description: "SpO2 levels",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {vitals.map((v) => (
        <KPICard
          key={v.label}
          label={v.label}
          value={v.val}
          unit={v.unit}
          icon={v.icon}
          trend={v.trend}
          color={v.color}
          description={v.description}
        />
      ))}
    </div>
  );
}
