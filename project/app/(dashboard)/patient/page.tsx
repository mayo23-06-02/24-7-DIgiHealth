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
import { useAuthContext } from "@/components/auth/AuthProvider";
import {
  BiPlus,
  BiTime,
  BiFile,
  BiHeart,
  BiPulse,
  BiDroplet,
  BiBody,
  BiRuler,
  BiCapsule,
  BiLoaderCircle,
} from "react-icons/bi";
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

  if (!mounted || !user)
    return (
      <div className="p-40 text-center  text-slate-300">
        Synchronizing Clinical Environment...
      </div>
    );

  if (!loading && dashboardData?.isNewUser) {
    return (
      <div className="space-y-10 p-4 pb-24 max-w-4xl mx-auto">
        {/* Hero Welcome */}
        <div className="text-center py-12 space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto">
            <BiHeart size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-grotesk">
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
            <div className="group p-7 rounded-2xl border-2 border-slate-100 hover:border-primary bg-white cursor-pointer transition-all duration-200 h-full flex flex-col">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                <BiFile size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-grotesk mb-2">
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
            className="group p-7 rounded-2xl border-2 border-slate-100 hover:border-emerald-400 bg-white cursor-pointer transition-all duration-200 h-full flex flex-col"
            onClick={() => handleUpdateClick("heartRate", "Heart Rate")}
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-4">
              <BiPulse size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800 font-grotesk mb-2">
              Log Your First Vitals
            </h3>
            <p className="text-sm text-slate-500 flex-1">
              Record your heart rate, blood pressure, and glucose levels.
            </p>
            <span className="text-emerald-500 font-bold text-sm mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">
              Add Vitals →
            </span>
          </div>

          <Link href="/patient/appointments">
            <div className="group p-7 rounded-2xl border-2 border-slate-100 hover:border-blue-400 bg-white cursor-pointer transition-all duration-200 h-full flex flex-col">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-4">
                <BiTime size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-grotesk mb-2">
                Book First Appointment
              </h3>
              <p className="text-sm text-slate-500 flex-1">
                Schedule a consultation with one of our registered
                practitioners.
              </p>
              <span className="text-blue-500 font-bold text-sm mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">
                Book Now →
              </span>
            </div>
          </Link>
        </div>

        {/* Doctor Carousel — visible even to new users */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 font-grotesk mb-4">
            Meet Our Practitioners
          </h2>
          <DoctorCarousel />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2 pb-24">
      {/* WELCOME HEADER */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold  text-slate-900 tracking-tight font-grotesk">
            How are you doing today,{" "}
            <span className="text-primary font-bold">{user.firstName}</span>?
          </h2>
          <p className="text-slate-600 text-lg tracking-tight mt-1">
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
              <span className="text-slate-700 mr-2 flex items-center gap-1 font-bold">
                <BiCapsule className="text-xl" /> Prescriptions
              </span>
            </Button>
          </Link>
          <Link href="/patient/appointments">
            <Button size="sm" className="shadow-none shadow-primary/20">
              <span className="mr-3 flex items-center gap-1 font-bold">
                <BiPlus className="text-xl" /> Book
              </span>
            </Button>
          </Link>
        </div>
      </section>

      {/* KPI GRID — showing last weigh-in only; clinical vitals commented out for future use */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* <KPICard
          label="Heart Rate"
          value={dashboardData?.vitals?.heartRate ? dashboardData.vitals.heartRate.toString() : "---"}
          unit="bpm"
          icon={<BiHeart size={24} />}
          trend={dashboardData?.vitals?.heartRateTrend || 0}
          color={dashboardData?.vitals?.heartRate ? "primary" : "slate"}
          description={dashboardData?.vitals?.heartRate ? "Current reading" : "Update required"}
          onClick={() => handleUpdateClick("heartRate", "Heart Rate")}
        /> */}
        {/* <KPICard
          label="Blood Pressure"
          value={dashboardData?.vitals?.bloodPressure && dashboardData.vitals.bloodPressure !== "0/0" ? dashboardData.vitals.bloodPressure : "---/---"}
          icon={<BiPulse size={24} />}
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
          icon={<BiBody size={24} />}
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
          icon={<BiBody size={24} />}
          trend={0}
          color={dashboardData?.vitals?.height ? "slate" : "slate"}
          description={
            dashboardData?.vitals?.height ? "Last recorded" : "Update required"
          }
          onClick={() => handleUpdateClick("weight", "Body Mass & Height")}
        />
        {/* <KPICard
          label="Glucose"
          value={dashboardData?.vitals?.glucose ? dashboardData.vitals.glucose.toString() : "0"}
          unit="mmol"
          icon={<BiDroplet size={24} />}
          trend={dashboardData?.vitals?.glucoseTrend || 0}
          color={dashboardData?.vitals?.glucose ? "primary" : "slate"}
          description={dashboardData?.vitals?.glucose ? "Last test result" : "Update required"}
          onClick={() => handleUpdateClick("glucose", "Glucose")}
        /> */}
      </section>

      {/* MID SECTION */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 space-y-6 flex flex-col">
          <Card className="flex-1 min-h-[500px]" noPadding>
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

      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title={`Update ${updateVitalTitle}`}
      >
        <form onSubmit={handleUpdateVitalSubmit} className="space-y-6">
          {/* Educational Explanation */}
          <div className=" rounded-xl p-5 border border-primary/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0 mt-0.5">
                <BiPlus size={18} />
              </div>
              <div className="space-y-1">
                <h1 className=" font-bold text-slate-900">
                  What is {updateVitalTitle}?
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {updateVitalType === "heartRate" &&
                    "Your heart rate (or pulse) is the number of times your heart beats per minute. A normal resting heart rate for adults ranges from 60 to 100 beats per minute."}
                  {updateVitalType === "bloodPressure" &&
                    "Blood pressure measures the force of blood against your artery walls. It uses two numbers: Systolic (heart beating) and Diastolic (heart resting). 120/80 mmHg is generally considered normal."}
                  {updateVitalType === "weight" &&
                    "Tracking your weight helps monitor your general health and calculate your Body Mass Index (BMI). Combined with height, it helps determine if your weight is in a healthy range."}
                  {updateVitalType === "glucose" &&
                    "Blood glucose measures the sugar levels in your blood. It's a key indicator of metabolic health. Normal fasting levels are typically between 4.0 and 5.4 mmol/L."}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {updateVitalType === "weight" ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h1 className="block text-sm font-semibold text-slate-500  mb-2">
                      Current Weight
                    </h1>
                    <div className="relative">
                      <input
                        type="text"
                        value={updateVitalValue}
                        onChange={(e) => setUpdateVitalValue(e.target.value)}
                        placeholder="e.g. 70"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-lg font-bold text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all placeholder:text-slate-300"
                        required
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                        kg
                      </div>
                    </div>
                  </div>
                  <div>
                    <h1 className="block text-sm font-semibold text-slate-500  mb-2">
                      Current Height
                    </h1>
                    <div className="relative">
                      <input
                        type="text"
                        value={updateHeightValue}
                        onChange={(e) => setUpdateHeightValue(e.target.value)}
                        placeholder="e.g. 175"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-lg font-bold text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all placeholder:text-slate-300"
                        required
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                        cm
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live BMI Indicator */}
                {Number(updateVitalValue) > 0 &&
                  Number(updateHeightValue) > 0 && (
                    <div className=" rounded-xl p-4 flex items-center justify-between border border-primary/20 animate-in zoom-in-95 duration-300">
                      <div>
                        <p className="text-sm  text-primary ">
                          BMI Calculation
                        </p>
                        <h1 className="text-2xl font-bold text-slate-900">
                          {(
                            Number(updateVitalValue) /
                            Math.pow(Number(updateHeightValue) / 100, 2)
                          ).toFixed(1)}
                        </h1>
                      </div>
                      <div className="text-right">
                        <p className="text-sm  text-slate-500 ">Status</p>
                        <h1 className="text-sm font-bold uppercase text-primary">
                          {(() => {
                            const bmi =
                              Number(updateVitalValue) /
                              Math.pow(Number(updateHeightValue) / 100, 2);
                            if (bmi < 18.5) return "Underweight";
                            if (bmi < 25) return "Healthy Weight";
                            if (bmi < 30) return "Overweight";
                            return "Obese";
                          })()}
                        </h1>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div>
                <h1 className="block text-sm  text-slate-500 mb-2">
                  New {updateVitalTitle} Value
                </h1>
                <div className="relative">
                  <input
                    type="text"
                    value={updateVitalValue}
                    onChange={(e) => setUpdateVitalValue(e.target.value)}
                    placeholder={
                      updateVitalType === "bloodPressure"
                        ? "e.g. 120/80"
                        : "Enter value..."
                    }
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-lg font-bold text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all placeholder:text-slate-300"
                    required
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 ">
                    {updateVitalType === "heartRate" && "bpm"}
                    {updateVitalType === "glucose" && "mmol/L"}
                  </div>
                </div>
              </div>
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
