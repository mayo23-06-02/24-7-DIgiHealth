"use client";

import React from "react";
import { BiBuilding, BiEnvelope } from "react-icons/bi";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

interface HospitalAdminRoleData {
  department: string;
  permissions: string[];
  facility: {
    name: string;
    facilityType: string;
    contactInfo: { phone: string; email: string };
    address: { city: string; province: string; street?: string };
    bedCapacity: {
      total: number;
      generalAvailable: number;
      icuAvailable: number;
    };
    specialties: string[];
    emergencyServices: boolean;
  };
}

interface HospitalFacilityFormProps {
  hospitalData: HospitalAdminRoleData;
  setHospitalData: React.Dispatch<React.SetStateAction<HospitalAdminRoleData | null>>;
}

function SectionHead({
  icon,
  title,
  sub,
  color = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    rose: "bg-rose-500/10 text-rose-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    blue: "bg-blue-500/10 text-blue-500",
    gray: "bg-slate-500/10 text-slate-500",
  };
  return (
    <div className="flex items-center gap-5">
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center ${
          colorMap[color] || colorMap.primary
        }`}
      >
        {icon}
      </div>
      <div className="gap-1 flex flex-col">
        <h4 className="text-xl font-bold text-slate-800 tracking-tight font-grotesk">
          {title}
        </h4>
        <p className="text-xs text-slate-600 uppercase opacity-70">{sub}</p>
      </div>
    </div>
  );
}

export default function HospitalFacilityForm({
  hospitalData,
  setHospitalData,
}: HospitalFacilityFormProps) {
  return (
    <>
      <Card className="p-8 space-y-8 rounded-lg border-slate-100 shadow-slate-900/5">
        <SectionHead
          icon={<BiBuilding size={24} />}
          title="Facility Infrastructure"
          sub="Manage hospital coordinates and clinical capacity"
          color="primary"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <Input
            label="Facility Name"
            value={hospitalData.facility.name}
            onChange={(e) =>
              setHospitalData((prev) =>
                prev
                  ? {
                      ...prev,
                      facility: {
                        ...prev.facility,
                        name: e.target.value,
                      },
                    }
                  : null
              )
            }
            placeholder="e.g. City Central Hospital"
          />
          <Input
            label="Department / Office"
            value={hospitalData.department}
            onChange={(e) =>
              setHospitalData((prev) =>
                prev ? { ...prev, department: e.target.value } : null
              )
            }
            placeholder="e.g. Administration"
          />
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Total Bed Capacity"
              type="number"
              value={hospitalData.facility.bedCapacity.total}
              onChange={(e) =>
                setHospitalData((prev) =>
                  prev
                    ? {
                        ...prev,
                        facility: {
                          ...prev.facility,
                          bedCapacity: {
                            ...prev.facility.bedCapacity,
                            total: parseInt(e.target.value) || 0,
                          },
                        },
                      }
                    : null
                )
              }
            />
            <Input
              label="General Available"
              type="number"
              value={hospitalData.facility.bedCapacity.generalAvailable}
              onChange={(e) =>
                setHospitalData((prev) =>
                  prev
                    ? {
                        ...prev,
                        facility: {
                          ...prev.facility,
                          bedCapacity: {
                            ...prev.facility.bedCapacity,
                            generalAvailable: parseInt(e.target.value) || 0,
                          },
                        },
                      }
                    : null
                )
              }
            />
            <Input
              label="ICU Available"
              type="number"
              value={hospitalData.facility.bedCapacity.icuAvailable}
              onChange={(e) =>
                setHospitalData((prev) =>
                  prev
                    ? {
                        ...prev,
                        facility: {
                          ...prev.facility,
                          bedCapacity: {
                            ...prev.facility.bedCapacity,
                            icuAvailable: parseInt(e.target.value) || 0,
                          },
                        },
                      }
                    : null
                )
              }
            />
          </div>
        </div>
      </Card>

      <Card className="p-8 space-y-8 rounded-lg border-slate-100 shadow-slate-900/5">
        <SectionHead
          icon={<BiEnvelope size={24} />}
          title="Contact Signals"
          sub="Direct clinical and emergency communication lines"
          color="emerald"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <Input
            label="General Phone"
            value={hospitalData.facility.contactInfo.phone}
            onChange={(e) =>
              setHospitalData((prev) =>
                prev
                  ? {
                      ...prev,
                      facility: {
                        ...prev.facility,
                        contactInfo: {
                          ...prev.facility.contactInfo,
                          phone: e.target.value,
                        },
                      },
                    }
                  : null
              )
            }
          />
          <Input
            label="Official Email"
            value={hospitalData.facility.contactInfo.email}
            onChange={(e) =>
              setHospitalData((prev) =>
                prev
                  ? {
                      ...prev,
                      facility: {
                        ...prev.facility,
                        contactInfo: {
                          ...prev.facility.contactInfo,
                          email: e.target.value,
                        },
                      },
                    }
                  : null
              )
            }
          />
          <Input
            label="Facility Type"
            value={hospitalData.facility.facilityType}
            disabled
            className="opacity-60 bg-slate-100"
          />
          <Input
            label="Province"
            value={hospitalData.facility.address.province}
            disabled
            className="opacity-60 bg-slate-100"
          />
        </div>
      </Card>
    </>
  );
}
