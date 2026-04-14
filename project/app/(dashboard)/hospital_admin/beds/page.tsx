"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import {
  BiBuildings,
  BiTrendingUp,
  BiDotsVerticalRounded,
  BiChevronDown,
  BiSearch,
  BiFilter,
  BiRefresh,
  BiLoaderAlt,
  BiBed,
  BiX,
  BiPulse,
} from "react-icons/bi";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

// --- Types ---
interface Bed {
  _id: string;
  ward: string;
  bedNumber: string;
  status: "available" | "occupied" | "cleaning";
  patientId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

// --- Mock Data for Chart ---
const incomingData = [
  { month: "Apr", regular: 380, emergency: 420 },
  { month: "May", regular: 480, emergency: 150 },
  { month: "Jun", regular: 250, emergency: 220 },
  { month: "Jul", regular: 420, emergency: 280 },
  { month: "Aug", regular: 510, emergency: 120 },
  { month: "Sep", regular: 360, emergency: 440 },
];

// --- Sub Componets ---

const FloorStack = ({
  level,
  label,
  status,
}: {
  level: number;
  label: string;
  status: "free" | "congested";
}) => {
  const tilt = "skew-x-[-30deg] rotate-[20deg]";
  const colors = {
    free: "bg-emerald-400/80 border-emerald-300",
    congested: "bg-teal-700/90 border-teal-600",
  };

  return (
    <div
      className={`absolute w-48 h-32 border-2 transition-all duration-500 shadow-xl flex items-center justify-center ${tilt} ${colors[status]}`}
      style={{
        bottom: `${level * 40}px`,
        left: `${level * 20}px`,
        zIndex: 10 - level,
      }}
    >
      <span className="text-white font-black text-2xl -rotate-[20deg] skew-x-[30deg]">
        {label}
      </span>
    </div>
  );
};

const BedSquare = ({ bed, onClick }: { bed: Bed; onClick: () => void }) => {
  const getStatusColor = () => {
    switch (bed.status) {
      case "available":
        return "bg-slate-100 hover:bg-emerald-100 border-slate-200";
      case "occupied":
        return "bg-teal-600 text-white border-teal-500";
      case "cleaning":
        return "bg-teal-200 border-teal-100";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  return (
    <div
      onClick={onClick}
      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-90 text-xs font-bold ${getStatusColor()}`}
    >
      {bed.bedNumber}
    </div>
  );
};

// --- Main Page ---

export default function BedManagement() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [selectedFloor, setSelectedFloor] = useState("Floor B");

  const fetchBeds = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hospital/beds");
      const json = await res.json();
      if (json.success) setBeds(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, []);

  const floorMap = useMemo(() => {
    const map: Record<string, Bed[]> = {};
    beds.forEach((bed) => {
      const ward = bed.ward || "General";
      if (!map[ward]) map[ward] = [];
      map[ward].push(bed);
    });
    return map;
  }, [beds]);

  const stats = useMemo(() => {
    const total = beds.length;
    const occupied = beds.filter((b) => b.status === "occupied").length;
    const available = beds.filter((b) => b.status === "available").length;
    return { total, occupied, available };
  }, [beds]);

  const updateBedStatus = async (
    id: string,
    newStatus: string,
    patientId: string | null = null,
  ) => {
    try {
      const res = await fetch(`/api/hospital/beds/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, patientId }),
      });
      const json = await res.json();
      if (json.success) {
        setBeds((prev) => prev.map((b) => (b._id === id ? json.data : b)));
        setSelectedBed(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Floors Overview Card */}
          <Card className="min-h-[420px] relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <BiBuildings className="text-slate-400" />
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                  Floors Overview
                </h3>
              </div>
              <button className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                {selectedFloor} <BiChevronDown />
              </button>
            </div>

            <h2 className="text-3xl font-black text-slate-800 mb-8">
              {stats.occupied + 10} patients
            </h2>

            {/* Isometric Stack Visual */}
            <div className="relative flex-1 py-10 scale-75 xl:scale-100 origin-center -translate-x-4">
              {Object.entries(floorMap)
                .slice(0, 4)
                .map(([ward, wardBeds], i) => {
                  const utilization =
                    wardBeds.length > 0
                      ? wardBeds.filter((b) => b.status === "occupied").length /
                        wardBeds.length
                      : 0;
                  return (
                    <FloorStack
                      key={ward}
                      level={i}
                      label={String.fromCharCode(65 + i)}
                      status={utilization > 0.7 ? "congested" : "free"}
                    />
                  );
                })}
            </div>

            {/* Content Sidebar on Card */}
            <div className="absolute top-24 right-6 text-right space-y-6">
              <div className="flex flex-col items-end">
                <span className="text-[10px] bg-rose-500 text-white font-black px-2 py-0.5 rounded italic mb-2 tracking-tighter">
                  CONGESTED
                </span>
                <p className="text-4xl font-black text-slate-800">47</p>
                <p className="text-[11px] font-black text-slate-400 uppercase">
                  General Rooms
                </p>
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-1">
                  ● 8 Available
                </span>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-4xl font-black text-slate-800">28</p>
                <p className="text-[11px] font-black text-slate-400 uppercase">
                  Private Rooms
                </p>
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-1">
                  ● 13 Available
                </span>
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="mt-auto flex flex-col gap-2">
              <div className="h-2 w-full bg-gradient-to-r from-emerald-100 via-emerald-400 to-teal-800 rounded-full" />
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Free</span>
                <span>Congested</span>
              </div>
            </div>
          </Card>

          {/* Incoming History Card */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <BiPulse className="text-slate-400" />
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                  Patients Incoming History
                </h3>
              </div>
              <button className="text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                Last 6 months <BiChevronDown />
              </button>
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={incomingData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      fontWeight: "bold",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="regular"
                    stroke="#cbd5e1"
                    strokeWidth={3}
                    dot={{
                      stroke: "#cbd5e1",
                      strokeWidth: 2,
                      fill: "#fff",
                      r: 4,
                    }}
                    activeDot={{ r: 6, fill: "#64748b" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="emergency"
                    stroke="#e11d48"
                    strokeWidth={3}
                    dot={{
                      stroke: "#e11d48",
                      strokeWidth: 2,
                      fill: "#fff",
                      r: 4,
                    }}
                    activeDot={{ r: 6, fill: "#e11d48" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Regular Patients
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Emergency Patients
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8">
          <Card noPadding className="min-h-full flex flex-col relative">
            <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-20">
              <div className="flex items-center gap-2">
                <BiSearch className="text-slate-400" />
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                  All Floors Heatmap
                </h3>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-48 h-2.5 bg-gradient-to-r from-emerald-100 via-emerald-400 to-teal-800 rounded-full" />
                  <div className="flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Free</span>
                    <span>Congested</span>
                  </div>
                </div>
                <BiRefresh
                  className={`text-slate-300 cursor-pointer hover:text-primary transition-all ${loading ? "animate-spin" : ""}`}
                  size={24}
                  onClick={fetchBeds}
                />
              </div>
            </div>

            <div className="flex-1 p-6 space-y-12 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                  <BiLoaderAlt className="animate-spin text-primary text-4xl" />
                </div>
              ) : (
                Object.entries(floorMap).map(([ward, wardBeds], idx) => (
                  <div key={ward} className="space-y-4">
                    <div className="flex items-start gap-8">
                      {/* Floor Label Sidebar */}
                      <div className="w-32 flex flex-col gap-1 shrink-0 pt-2">
                        <span className="w-fit bg-slate-800 text-white font-black text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest mb-2">
                          FLOOR {String.fromCharCode(65 + idx)}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-800">
                            {
                              wardBeds.filter((b) => b.status === "occupied")
                                .length
                            }
                          </span>
                          <span className="text-[10px] font-black text-emerald-500">
                            -12% ↗
                          </span>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase">
                          Patients
                        </p>

                        <div className="mt-4 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-800">
                            {
                              wardBeds.filter((b) => b.status === "available")
                                .length
                            }
                          </span>
                          <span className="text-[10px] font-black text-rose-400">
                            -7% ↘
                          </span>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase">
                          Beds Available
                        </p>

                        <div className="mt-4">
                          <span className="text-2xl font-black text-slate-800">
                            32
                          </span>
                          <p className="text-[11px] font-black text-slate-400 uppercase">
                            Rooms
                          </p>
                        </div>
                      </div>

                      {/* Bed Grid */}
                      <div className="flex-1 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3 pb-8 border-b border-slate-50 last:border-0 grow">
                        {wardBeds
                          .sort(
                            (a, b) =>
                              parseInt(a.bedNumber) - parseInt(b.bedNumber),
                          )
                          .map((bed) => (
                            <BedSquare
                              key={bed._id}
                              bed={bed}
                              onClick={() => setSelectedBed(bed)}
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Cap for Heatmap */}
            <div className="p-4 bg-slate-50 mt-auto">
              <label className="bg-slate-800 text-white text-[9px] font-black px-4 py-1.5 rounded-full tracking-widest uppercase">
                FLOOR C
              </label>
            </div>
          </Card>
        </div>
      </div>

      {/* Bed Detail Modal */}
      {selectedBed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setSelectedBed(null)}
          />
          <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-xl">
                  Bed {selectedBed.bedNumber}
                </h3>
                <p className="text-xs text-primary uppercase tracking-widest mt-0.5">
                  {selectedBed.ward} Ward
                </p>
              </div>
              <button
                onClick={() => setSelectedBed(null)}
                className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <BiX size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6 text-center">
              <div
                className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center border-4 ${selectedBed.status === "occupied" ? "border-teal-500 bg-teal-50 text-teal-600" : "border-slate-100 bg-slate-50 text-slate-400"}`}
              >
                <BiBed size={48} />
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Current Status
                  </p>
                  <p className="font-black text-slate-800 text-lg uppercase tracking-tight">
                    {selectedBed.status}
                  </p>
                </div>

                {selectedBed.status === "occupied" && selectedBed.patientId && (
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1.5">
                      Assigned Patient
                    </p>
                    <p className="font-black text-primary text-lg">
                      {selectedBed.patientId.firstName}{" "}
                      {selectedBed.patientId.lastName}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 space-y-3">
                {selectedBed.status === "available" && (
                  <button
                    onClick={() => updateBedStatus(selectedBed._id, "occupied")}
                    className="w-full py-4 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/80 transition-all active:scale-95"
                  >
                    Admit Patient
                  </button>
                )}
                {selectedBed.status === "occupied" && (
                  <button
                    onClick={() =>
                      updateBedStatus(selectedBed._id, "cleaning", null)
                    }
                    className="w-full py-4 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95"
                  >
                    Discharge & Mark Cleaning
                  </button>
                )}
                {selectedBed.status === "cleaning" && (
                  <button
                    onClick={() =>
                      updateBedStatus(selectedBed._id, "available")
                    }
                    className="w-full py-4 rounded-xl border-2 border-emerald-100 text-emerald-600 font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all active:scale-95"
                  >
                    Mark Ready (Available)
                  </button>
                )}
                <button className="w-full py-3 text-xs font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors">
                  View Clinical Charts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS CUSTOM UTILS INLINED FOR SPEED */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
