"use client";
import React from "react";
import Card from "@/components/ui/Card";
import { BiChevronDown } from "react-icons/bi";
import { ChartDataPoint } from "./types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface PatientChartProps {
  data: ChartDataPoint[];
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

export default function PatientChart({
  data,
  selectedPeriod = "current",
  onPeriodChange,
}: PatientChartProps) {
  const monthOptions = [
    { value: "current", label: "This Month" },
    { value: "last", label: "Last Month" },
    { value: "2months", label: "Last 2 Months" },
    { value: "3months", label: "Last 3 Months" },
    { value: "6months", label: "Last 6 Months" },
    { value: "year", label: "This Year" },
  ];

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: "New Patients",
        data: data.map((d) => d.value),
        backgroundColor: data.map((d) =>
          d.value === Math.max(...data.map((item) => item.value)) && d.value > 0
            ? "#2b617a"
            : "rgba(43, 97, 122, 0.2)",
        ),
        borderColor: data.map((d) =>
          d.value === Math.max(...data.map((item) => item.value)) && d.value > 0
            ? "#2b617a"
            : "rgba(43, 97, 122, 0.5)",
        ),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y} new patients`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(148, 163, 184, 0.1)",
          borderDash: [5, 5],
        },
        ticks: {
          color: "#64748b",
          font: {
            size: 11,
          },
        },
        border: {
          display: false,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#64748b",
          font: {
            size: 11,
          },
        },
        border: {
          display: false,
        },
      },
    },
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800 font-grotesk">
          Patient Growth
        </h3>
        {/*add a percentage growth label*/}
        <span className="text-xs font-bold text-slate-500">
          +{data[data.length - 1].value - data[data.length - 2].value}%
        </span>
      </div>

      <div className="flex-1 w-full relative min-h-[200px]">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </Card>
  );
}
