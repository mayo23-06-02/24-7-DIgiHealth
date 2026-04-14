"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import KPICard from "@/components/ui/KPICard";
import MedicalManikin from "@/components/ui/MedicalManikin";
import PatientCalendar from "@/components/dashboard/patient/PatientCalendar";
import HealthActionCenter from "@/components/dashboard/patient/HealthActionCenter";
import DepartmentExplore from "@/components/dashboard/patient/DepartmentExplore";
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
} from "react-icons/bi";
import Link from "next/link";

export default function PatientDashboard() {
  const { user } = useAuthContext();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!user) return;
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
    fetchDashboard();
  }, [user]);

  if (!mounted || !user)
    return (
      <div className="p-20 text-center font-black text-slate-300">
        Synchronizing Clinical Environment...
      </div>
    );

  return (
    <div className="space-y-8 p-2 pb-24">
      {/* WELCOME HEADER */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font- text-slate-800 tracking-tight">
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
            <Button size="sm" className="shadow-lg shadow-primary/20">
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
          value={dashboardData?.vitals?.heartRate.toString() || "72"}
          unit="bpm"
          icon={<BiHeart size={24} />}
          trend={2}
          color="primary"
          description="Current reading"
        />
        <KPICard
          label="Blood Pressure"
          value={dashboardData?.vitals?.bloodPressure || "120/80"}
          icon={<BiPulse size={24} />}
          trend={-1}
          color="emerald"
          description="Last recorded"
        />
        <KPICard
          label="Body Mass"
          value={dashboardData?.vitals?.weight.toString() || "0"}
          unit="kg"
          icon={<BiBody size={24} />}
          trend={-0.5}
          color="slate"
          description="Latest weight"
        />
        <KPICard
          label="Glucose"
          value={dashboardData?.vitals?.glucose.toString() || "0"}
          unit="mmol"
          icon={<BiDroplet size={24} />}
          trend={1}
          color="primary"
          description="Last test result"
        />
      </section>

      {/* MID SECTION */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-4 h-[700px] ">
          <MedicalManikin
            gender={
              dashboardData?.profile?.gender || (user.gender as any) || "male"
            }
            heightCm={dashboardData?.vitals?.height || 165}
            weightKg={dashboardData?.vitals?.weight || 68}
          />
        </Card>
        <Card className="xl:col-span-4 h-[700px] overflow-hidden flex flex-col p-0">
          <PatientCalendar />
        </Card>
        <div className="xl:col-span-4 h-[700px]">
          <HealthActionCenter />
        </div>
      </section>

      {/* EXPLORE DEPARTMENTS */}
      <section className="pt-4">
        <div className="mb-4 px-2">
          <h3 className="font-bold text-xl text-slate-800">
            Clinical Departments
          </h3>
          <p className="text-sm text-slate-500">
            Browse specialist providers by category
          </p>
        </div>
        <DepartmentExplore />
      </section>

      {/* NEWS & BLOG */}
      <section className="pt-4">
        <div className="mb-4 px-2">
          <h3 className="font-bold text-xl text-slate-800">Health Insights</h3>
          <p className="text-sm text-slate-500">
            Latest medical news and wellness articles
          </p>
        </div>
        <HealthBlog />
      </section>

      {/* GLOBAL FLOATING ACTIONS */}
      <div className="fixed bottom-10 right-10 z-50">
        <button
          onClick={() => setIsChatOpen(true)}
          className="w-16 h-16 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <span className="text-2xl group-hover:rotate-12 transition-transform">
            🏥
          </span>
        </button>
      </div>

      <AITriageChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        patientName={`${user.firstName} ${user.lastName}`}
      />
    </div>
  );
}
