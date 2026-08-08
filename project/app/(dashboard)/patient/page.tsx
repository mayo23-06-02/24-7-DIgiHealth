"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import KPICard from "@/components/ui/KPICard";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import MedicalManikin from "@/components/ui/MedicalManikin";
import PatientCalendar from "@/components/dashboard/patient/PatientCalendar";
import DoctorCarousel from "@/components/doctor/DoctorCarousel";
import HealthBlog from "@/components/dashboard/patient/HealthBlog";
import { useAuthContext } from "@/components/auth/AuthProvider";
import {
  Plus,
  Clock,
  FileText,
  HeartPulse,
  Activity,
  Pill,
  Scale,
  Ruler,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";

export default function PatientDashboard() {
  const { user } = useAuthContext();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Vital Update Modal states
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateVitalType, setUpdateVitalType] = useState("");
  const [updateVitalTitle, setUpdateVitalTitle] = useState("");
  const [updateVitalValue, setUpdateVitalValue] = useState("");
  const [updateHeightValue, setUpdateHeightValue] = useState("");
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

    // Pre-fill existing values
    if (dashboardData?.vitals) {
      const v = dashboardData.vitals;
      if (type === "heartRate")
        setUpdateVitalValue(v.heartRate > 0 ? v.heartRate.toString() : "");
      if (type === "bloodPressure")
        setUpdateVitalValue(v.bloodPressure !== "0/0" ? v.bloodPressure : "");
      if (type === "weight") {
        setUpdateVitalValue(v.weight > 0 ? v.weight.toString() : "");
        setUpdateHeightValue(v.height > 0 ? v.height.toString() : "");
      }
      if (type === "glucose")
        setUpdateVitalValue(v.glucose > 0 ? v.glucose.toString() : "");
    } else {
      setUpdateVitalValue("");
      setUpdateHeightValue("");
    }

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
          height: updateVitalType === "weight" ? updateHeightValue : undefined,
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

  const vitalExplanations: Record<string, string> = {
    heartRate:
      "Your heart rate (or pulse) is the number of times your heart beats per minute. A normal resting heart rate for adults ranges from 60 to 100 beats per minute.",
    bloodPressure:
      "Blood pressure measures the force of blood against your artery walls. It uses two numbers: Systolic (heart beating) and Diastolic (heart resting). 120/80 mmHg is generally considered normal.",
    weight:
      "Tracking your weight helps monitor your general health and calculate your Body Mass Index (BMI). Combined with height, it helps determine if your weight is in a healthy range.",
    glucose:
      "Blood glucose measures the sugar levels in your blood. It's a key indicator of metabolic health. Normal fasting levels are typically between 4.0 and 5.4 mmol/L.",
  };

  if (!mounted || !user)
    return (
      <div className="p-40 text-center text-slate-300">
        Synchronizing Clinical Environment...
      </div>
    );

  if (!loading && dashboardData?.isNewUser) {
    return (
      <div className="space-y-10 p-4 pb-24 max-w-4xl mx-auto">
        {/* Hero Welcome */}
        <div className="text-center py-12 space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto">
            <HeartPulse size={40} />
          </div>
          <h1 className="text-h1 font-bold text-ink-900 font-grotesk">
            Welcome to DigiHealth,{" "}
            <span className="text-primary">{user.firstName}</span>!
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Your personal health hub is ready. Let's get you set up so your care
            team has everything they need to support you.
          </p>
        </div>

        {/* Onboarding Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link href="/patient/health-record">
            <div className="group p-7 rounded-xl border-2 border-slate-100 hover:border-primary bg-white cursor-pointer transition-all duration-200 h-full flex flex-col">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                <FileText size={24} />
              </div>
              <h3 className="text-base font-bold text-ink-900 font-grotesk mb-2">
                Complete Health Profile
              </h3>
              <p className="text-sm text-slate-500 flex-1">
                Add your medical history, allergies, and current conditions.
              </p>
              <span className="text-primary font-bold text-sm mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">
                Get Started →
              </span>
            </div>
          </Link>

          <div
            className="group p-7 rounded-xl border-2 border-slate-100 hover:border-success-500 bg-white cursor-pointer transition-all duration-200 h-full flex flex-col"
            onClick={() => handleUpdateClick("heartRate", "Heart Rate")}
          >
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center text-success-700 mb-4">
              <Activity size={24} />
            </div>
            <h3 className="text-base font-bold text-ink-900 font-grotesk mb-2">
              Log Your First Vitals
            </h3>
            <p className="text-sm text-slate-500 flex-1">
              Record your heart rate, blood pressure, and glucose levels.
            </p>
            <span className="text-success-700 font-bold text-sm mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">
              Add Vitals →
            </span>
          </div>

          <Link href="/patient/appointments">
            <div className="group p-7 rounded-xl border-2 border-slate-100 hover:border-info-500 bg-white cursor-pointer transition-all duration-200 h-full flex flex-col">
              <div className="w-12 h-12 bg-info-50 rounded-xl flex items-center justify-center text-info-700 mb-4">
                <Clock size={24} />
              </div>
              <h3 className="text-base font-bold text-ink-900 font-grotesk mb-2">
                Book First Appointment
              </h3>
              <p className="text-sm text-slate-500 flex-1">
                Schedule a consultation with one of our registered
                practitioners.
              </p>
              <span className="text-info-700 font-bold text-sm mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">
                Book Now →
              </span>
            </div>
          </Link>
        </div>

        {/* Doctor Carousel — visible even to new users */}
        <section>
          <h2 className="text-h3 font-bold text-ink-900 font-grotesk mb-4">
            Meet Our Practitioners
          </h2>
          <DoctorCarousel />
        </section>
      </div>
    );
  }

  const todayLabel = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6 pb-24">
      {/* HERO */}
      <Card
        variant="glass"
        className="!p-6 sm:!p-8 border-primary/10 relative overflow-hidden"
      >
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-label text-primary uppercase tracking-wide mb-2">
              {todayLabel}
            </p>
            <h1 className="text-h1 font-bold text-ink-900 tracking-tight font-grotesk">
              How are you doing today,{" "}
              <span className="text-primary">{user.firstName}</span>?
            </h1>
            <p className="text-slate-500 mt-2 max-w-xl">
              Here is your personalized health snapshot for today — a clear
              view of your wellbeing at a glance.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/patient/appointments">
              <Button icon={<Plus size={18} />} iconPosition="left">
                Book Appointment
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* KPI GRID — showing last weigh-in only; clinical vitals commented out for future use */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* <KPICard
          label="Heart Rate"
          value={dashboardData?.vitals?.heartRate ? dashboardData.vitals.heartRate.toString() : "---"}
          unit="bpm"
          icon={<HeartPulse size={24} />}
          trend={dashboardData?.vitals?.heartRateTrend || 0}
          color={dashboardData?.vitals?.heartRate ? "primary" : "slate"}
          description={dashboardData?.vitals?.heartRate ? "Current reading" : "Update required"}
          onClick={() => handleUpdateClick("heartRate", "Heart Rate")}
        /> */}
        {/* <KPICard
          label="Blood Pressure"
          value={dashboardData?.vitals?.bloodPressure && dashboardData.vitals.bloodPressure !== "0/0" ? dashboardData.vitals.bloodPressure : "---/---"}
          icon={<Activity size={24} />}
          trend={dashboardData?.vitals?.bloodPressureTrend || 0}
          color={dashboardData?.vitals?.bloodPressure && dashboardData.vitals.bloodPressure !== "0/0" ? "emerald" : "slate"}
          description={dashboardData?.vitals?.bloodPressure && dashboardData.vitals.bloodPressure !== "0/0" ? "Last recorded" : "Update required"}
          onClick={() => handleUpdateClick("bloodPressure", "Blood Pressure")}
        /> */}
        <KPICard
          label="Weight"
          value={
            dashboardData?.vitals?.weight
              ? dashboardData.vitals.weight.toFixed(0).toString()
              : "---"
          }
          unit="kg"
          icon={<Scale size={24} />}
          trend={dashboardData?.vitals?.weightTrend || 0}
          color={dashboardData?.vitals?.weight ? "primary" : "slate"}
          description={
            dashboardData?.vitals?.weight ? "Last weigh-in" : "Update required"
          }
          onClick={() => handleUpdateClick("weight", "Body Mass & Height")}
        />
        <KPICard
          label="Height"
          value={
            dashboardData?.vitals?.height
              ? dashboardData.vitals.height.toString()
              : "---"
          }
          unit="cm"
          icon={<Ruler size={24} />}
          trend={0}
          color="slate"
          description={
            dashboardData?.vitals?.height ? "Last recorded" : "Update required"
          }
          onClick={() => handleUpdateClick("weight", "Body Mass & Height")}
        />
        {/* <KPICard
          label="Glucose"
          value={dashboardData?.vitals?.glucose ? dashboardData.vitals.glucose.toString() : "0"}
          unit="mmol"
          icon={<Droplet size={24} />}
          trend={dashboardData?.vitals?.glucoseTrend || 0}
          color={dashboardData?.vitals?.glucose ? "primary" : "slate"}
          description={dashboardData?.vitals?.glucose ? "Last test result" : "Update required"}
          onClick={() => handleUpdateClick("glucose", "Glucose")}
        /> */}
      </section>

      {/* MID SECTION */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 flex flex-col">
          <Card className="h-[600px]" noPadding>
            <MedicalManikin
              gender={
                dashboardData?.profile?.gender || (user.gender as any) || "male"
              }
              heightCm={dashboardData?.vitals?.height || 0}
              weightKg={dashboardData?.vitals?.weight || 0}
              onUpdateHeightWeight={() =>
                handleUpdateClick("weight", "Body Mass & Height")
              }
            />
          </Card>
        </div>
        <Card className="xl:col-span-7 h-[600px] overflow-hidden flex flex-col p-0">
          <PatientCalendar
            headerAction={
              <Link href="/patient/calendar">
                <Button variant="outline" size="sm">
                  View Full Calendar
                </Button>
              </Link>
            }
          />
        </Card>
      </section>

      {/* TOP DOCTORS CAROUSEL */}
      <section>
        <DoctorCarousel />
      </section>

      {/* NEWS & BLOG */}
      <section>
        <HealthBlog />
      </section>

      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title={`Update ${updateVitalTitle}`}
      >
        <form onSubmit={handleUpdateVitalSubmit} className="space-y-6">
          <Alert status="info" title={`What is ${updateVitalTitle}?`}>
            {vitalExplanations[updateVitalType]}
          </Alert>

          <div className="space-y-4">
            {updateVitalType === "weight" ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Current Weight (kg)"
                    value={updateVitalValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateVitalValue(e.target.value)
                    }
                    placeholder="e.g. 70"
                    required
                  />
                  <Input
                    label="Current Height (cm)"
                    value={updateHeightValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateHeightValue(e.target.value)
                    }
                    placeholder="e.g. 175"
                    required
                  />
                </div>

                {/* Live BMI Indicator */}
                {Number(updateVitalValue) > 0 &&
                  Number(updateHeightValue) > 0 && (
                    <div className="rounded-xl p-4 flex items-center justify-between bg-primary/5 border border-primary/20 animate-in zoom-in-95 duration-300">
                      <div>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                          BMI Calculation
                        </p>
                        <h4 className="text-h3 font-bold text-ink-900 tabular-nums">
                          {(
                            Number(updateVitalValue) /
                            Math.pow(Number(updateHeightValue) / 100, 2)
                          ).toFixed(1)}
                        </h4>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Status
                        </p>
                        <p className="text-sm font-bold uppercase text-primary">
                          {(() => {
                            const bmi =
                              Number(updateVitalValue) /
                              Math.pow(Number(updateHeightValue) / 100, 2);
                            if (bmi < 18.5) return "Underweight";
                            if (bmi < 25) return "Healthy Weight";
                            if (bmi < 30) return "Overweight";
                            return "Obese";
                          })()}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <Input
                label={`New ${updateVitalTitle} Value${
                  updateVitalType === "heartRate"
                    ? " (bpm)"
                    : updateVitalType === "glucose"
                      ? " (mmol/L)"
                      : ""
                }`}
                value={updateVitalValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUpdateVitalValue(e.target.value)
                }
                placeholder={
                  updateVitalType === "bloodPressure"
                    ? "e.g. 120/80"
                    : "Enter value..."
                }
                required
              />
            )}
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
              icon={isUpdatingVital ? <Loader2 className="animate-spin" size={18} /> : undefined}
              iconPosition="left"
            >
              {isUpdatingVital ? "Saving..." : "Update Record"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
