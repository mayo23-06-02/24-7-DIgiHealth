import React, { useState, useEffect } from "react";
import { BiPulse, BiPlanet, BiHeart, BiDroplet } from "react-icons/bi";
import KPICard from "@/components/ui/KPICard";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "react-hot-toast";

export default function VitalsGrid() {
  const [data, setData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    heartRate: "",
    bloodPressure: "",
    bodyMass: "",
    glucose: "",
  });

  const fetchVitals = () => {
    fetch('/api/patient/vitals')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  };

  useEffect(() => {
    fetchVitals();
  }, []);

  useEffect(() => {
    if (data) {
      setFormData({
        heartRate: data.heartRate?.toString() || "",
        bloodPressure: data.bp || "",
        bodyMass: data.weight?.toString() || "",
        glucose: data.glucose?.toString() || "",
      });
    }
  }, [data]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Vitals updated successfully");
        setIsModalOpen(false);
        fetchVitals(); // Refresh data
      } else {
        toast.error("Failed to update vitals");
      }
    } catch {
      toast.error("Network error while updating");
    }
    setLoading(false);
  };

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
      label: "Blood Glucose",
      val: data?.glucose || "--",
      unit: "mmol/L",
      icon: <BiDroplet size={24} />,
      trend: 0,
      color: "primary",
      description: "Recent reading",
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800 font-grotesk px-1">
          Recent Vitals
        </h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-sm font-bold text-primary hover:underline"
        >
          Update Vitals
        </button>
      </div>

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
            onClick={() => setIsModalOpen(true)}
          />
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update My Vitals"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Heart Rate (BPM)"
              placeholder="e.g. 72"
              value={formData.heartRate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, heartRate: e.target.value }))
              }
            />
            <Input
              label="Blood Pressure (mmHg)"
              placeholder="e.g. 120/80"
              value={formData.bloodPressure}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bloodPressure: e.target.value }))
              }
            />
            <Input
              label="Body Mass (kg)"
              placeholder="e.g. 70"
              value={formData.bodyMass}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bodyMass: e.target.value }))
              }
            />
            <Input
              label="Blood Glucose (mmol/L)"
              placeholder="e.g. 5.5"
              value={formData.glucose}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, glucose: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? "Updating..." : "Save Vitals"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
