"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import KPICard from "@/components/ui/KPICard";
import MedicalManikin from "@/components/ui/MedicalManikin";
import PatientCalendar from "@/components/dashboard/patient/PatientCalendar";
import HealthActionCenter from "@/components/dashboard/patient/HealthActionCenter";
import DoctorCarousel from "@/components/doctor/DoctorCarousel";
import HealthBlog from "@/components/dashboard/patient/HealthBlog";
import AITriageChat from "@/components/dashboard/patient/AITriageChat";
import { useAuthContext } from "@/components/auth/AuthProvider";
import {
  BiPlus,
  BiTime,
  BiFile,
  BiHeart,
  BiPulse,
  BiDroplet,
  BiBody,
  BiCapsule,
  BiBot,
  BiLoaderCircle,
  BiChat,
  BiMessage,
} from "react-icons/bi";
import Link from "next/link";
import Modal from "@/components/ui/Modal";

export default function PatientDashboard() {
  const { user } = useAuthContext();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Vital Update Modal states
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateVitalType, setUpdateVitalType] = useState("");
  const [updateVitalTitle, setUpdateVitalTitle] = useState("");
  const [updateVitalValue, setUpdateVitalValue] = useState("");
  const [isUpdatingVital, setIsUpdatingVital] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/patient/dashboard");
      const json = await res.json();
      if (json.success) setDashboardData(json.data);
    } catch (err) {
      console.error("Dashboard fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!user) return;
    fetchDashboard();
  }, [user]);

  const handleUpdateClick = (type: string, title: string) => {
    setUpdateVitalType(type);
    setUpdateVitalTitle(title);
    setUpdateVitalValue("");
    setUpdateModalOpen(true);
  };

  const handleUpdateVitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateVitalValue) return;

    setIsUpdatingVital(true);
    try {
      const res = await fetch("/api/patient/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vitalType: updateVitalType,
          value: updateVitalValue,
        }),
      });
      if (res.ok) {
        await fetchDashboard();
      }
    } catch (err) {
      console.error("Failed to update vital", err);
    } finally {
      setIsUpdatingVital(false);
      setUpdateModalOpen(false);
    }
  };

  if (!mounted || !user)
    return (
      <div className="p-40 text-center  text-slate-300">
        Synchronizing Clinical Environment...
      </div>
    );

  return (
    <div className="space-y-8 p-2 pb-24">
      {/* WELCOME HEADER */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl  text-slate-800 tracking-tight">
            How are you doing today,{" "}
            <span className="text-primary font-bold">{user.firstName}</span>?
          </h2>
          <p className="text-slate-500  tracking-tight mt-1">
            Here is your personalized health snapshot for today — a clear view
            of your wellbeing at a glance.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/patient/health-record">
            <Button
              variant="outline"
              size="sm"
              className="bg-white hover:bg-slate-50"
            >
              <span className="text-slate-600 mr-2 flex items-center gap-1 font-bold">
                <BiCapsule className="text-xl" /> Refill
              </span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="bg-white hover:bg-slate-50"
            onClick={() => setIsChatOpen(true)}
          >
            <span className="text-slate-600 mr-3 flex items-center gap-1 font-bold">
              <BiBot className="text-xl" /> AI Doctor
            </span>
          </Button>
          <Link href="/patient/appointments">
            <Button size="sm" className="shadow-none shadow-primary/20">
              <span className="mr-3 flex items-center gap-1 font-bold">
                <BiPlus className="text-xl" /> Book
              </span>
            </Button>
          </Link>
        </div>
      </section>

      {/* KPI GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Heart Rate"
          value={dashboardData?.vitals?.heartRate?.toString() || "72"}
          unit="bpm"
          icon={<BiHeart size={24} />}
          trend={2}
          color="primary"
          description="Current reading"
          onClick={() => handleUpdateClick("heartRate", "Heart Rate")}
        />
        <KPICard
          label="Blood Pressure"
          value={dashboardData?.vitals?.bloodPressure || "120/80"}
          icon={<BiPulse size={24} />}
          trend={-1}
          color="emerald"
          description="Last recorded"
          onClick={() => handleUpdateClick("bloodPressure", "Blood Pressure")}
        />
        <KPICard
          label="Body Mass"
          value={dashboardData?.vitals?.weight?.toString() || "0"}
          unit="kg"
          icon={<BiBody size={24} />}
          trend={-0.5}
          color="slate"
          description="Latest weight"
          onClick={() => handleUpdateClick("weight", "Body Mass")}
        />
        <KPICard
          label="Glucose"
          value={dashboardData?.vitals?.glucose?.toString() || "0"}
          unit="mmol"
          icon={<BiDroplet size={24} />}
          trend={1}
          color="primary"
          description="Last test result"
          onClick={() => handleUpdateClick("glucose", "Glucose")}
        />
      </section>

      {/* MID SECTION */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-5 h-[700px] ">
          <MedicalManikin
            gender={
              dashboardData?.profile?.gender || (user.gender as any) || "male"
            }
            heightCm={dashboardData?.vitals?.height || 165}
            weightKg={dashboardData?.vitals?.weight || 68}
          />
        </Card>
        <Card className="xl:col-span-7 h-[700px] overflow-hidden flex flex-col p-0">
          <PatientCalendar />
        </Card>
      </section>

      {/* TOP DOCTORS CAROUSEL */}
      <section className="">
        <DoctorCarousel />
      </section>

      {/* NEWS & BLOG */}
      <section className="">
        <HealthBlog />
      </section>

      {/* GLOBAL FLOATING ACTIONS */}
      <div className="fixed bottom-10 right-10 z-50">
        <button
          onClick={() => setIsChatOpen(true)}
          className="w-16 h-16 bg-primary text-white rounded-2xl  shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <span className="text-2xl group-hover:rotate-12 transition-transform">
            <BiMessage />
          </span>
        </button>
      </div>

      <AITriageChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        patientName={`${user.firstName} ${user.lastName}`}
      />

      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title={`Update ${updateVitalTitle}`}
      >
        <form onSubmit={handleUpdateVitalSubmit} className="space-y-4">
          <p className="text-sm text-slate-500 mb-4">
            Enter your latest {updateVitalTitle.toLowerCase()} reading to update
            your health record and track your progress.
          </p>
          <div>
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-normal mb-2">
              New {updateVitalTitle} Value
            </label>
            <input
              type="text"
              value={updateVitalValue}
              onChange={(e) => setUpdateVitalValue(e.target.value)}
              placeholder={
                updateVitalType === "bloodPressure"
                  ? "e.g. 120/80"
                  : updateVitalType === "weight"
                    ? "e.g. 70"
                    : "Enter value..."
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              required
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              fullWidth
              variant="outline"
              onClick={() => setUpdateModalOpen(false)}
              disabled={isUpdatingVital}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              type="submit"
              disabled={isUpdatingVital || !updateVitalValue}
            >
              {isUpdatingVital ? (
                <>
                  <BiLoaderCircle className="animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Update Record"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
