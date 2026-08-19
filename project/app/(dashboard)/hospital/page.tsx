"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BiLoaderAlt,
  BiUserPlus,
  BiBarChartAlt2,
  BiPlus,
  BiBuildings,
  BiRefresh,
} from "react-icons/bi";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import {
  FacilityBanner,
  HospitalKpiGrid,
  DoctorsOverview,
  PatientsOverview,
  HospitalIntelligence,
  UpcomingAppointments,
  ConsultationVolumeChart,
  StaffRoleChart,
  DepartmentChart,
  type HospitalOverviewData,
} from "@/components/dashboard/hospital";

export default function HospitalOverviewPage() {
  const [data, setData] = useState<HospitalOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hospital/dashboard");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load overview");
      }
      setData(json.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-350 mx-auto space-y-4 pb-16">
        <SkeletonLoader className="h-40 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 py-6">
          <BiLoaderAlt className="animate-spin text-primary" size={18} />
          Loading facility overview…
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <EmptyState
          title="Unable to load overview"
          description={error}
          icon={<BiBuildings size={32} />}
          actionLabel="Retry"
          onAction={() => void load()}
        />
      </div>
    );
  }

  if (!data) return null;

  if (data.isNewUser || !data.facility) {
    return (
      <div className="w-full pb-10 flex flex-col gap-8 max-w-4xl mx-auto py-12">
        <EmptyState
          title={`Welcome, ${data.name || "Administrator"}`}
          description="Complete your facility profile and add staff to unlock a full overview of doctors, patients, and operations."
          icon={<BiPlus size={32} />}
          className="py-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className="p-8 hover:border-primary transition-all cursor-pointer group"
            onClick={() => (window.location.href = "/hospital_admin/facility")}
          >
            <h3 className="text-xl font-bold text-slate-800 mb-2 font-grotesk">
              1. Facility profile
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Name, capacity, specialties, and contact details.
            </p>
            <span className="text-primary font-bold group-hover:underline">
              Go to settings →
            </span>
          </Card>
          <Card
            className="p-8 hover:border-primary transition-all cursor-pointer group"
            onClick={() => (window.location.href = "/hospital_admin/staff")}
          >
            <h3 className="text-xl font-bold text-slate-800 mb-2 font-grotesk">
              2. Add staff & doctors
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Onboard doctors, nurses, and admin personnel.
            </p>
            <span className="text-primary font-bold group-hover:underline">
              Manage staff →
            </span>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-350 mx-auto">
      {error && (
        <Card className="!bg-amber-50 !border-amber-200 text-sm text-amber-800 font-medium">
          {error}
        </Card>
      )}

      <FacilityBanner facility={data.facility} adminName={data.name} />

      <PageHeader
        title="Operational snapshot"
        subtitle="Doctors, patients, and clinic activity for this facility"
        right={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
            >
              Refresh
            </Button>
            <Link href="/hospital_admin/staff">
              <Button
                variant="outline"
                size="sm"
              >
                Staff
              </Button>
            </Link>
            <Link href="/hospital_admin/reports">
              <Button
                variant="primary"
                size="sm"
              >
                Reports
              </Button>
            </Link>
          </div>
        }
      />

      <HospitalKpiGrid kpi={data.kpi} />

      <HospitalIntelligence items={data.intelligence} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DoctorsOverview doctors={data.doctors} />
        <PatientsOverview
          patients={data.patients}
          totalUnique={data.kpi.uniquePatients}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ConsultationVolumeChart data={data.monthlyData} />
        </div>
        <StaffRoleChart data={data.staffByRole} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DepartmentChart data={data.departmentBreakdown} />
        <UpcomingAppointments items={data.upcomingAppointments} />
      </div>
    </div>
  );
}
