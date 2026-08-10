"use client";

import React from "react";
import { Building2, Mail, MapPin } from "lucide-react";
import Input from "@/components/ui/Input";
import ProfileSection from "./ProfileSection";

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
  setHospitalData: React.Dispatch<
    React.SetStateAction<HospitalAdminRoleData | null>
  >;
}

export default function HospitalFacilityForm({
  hospitalData,
  setHospitalData,
}: HospitalFacilityFormProps) {
  const fac = hospitalData.facility;

  const updateFacility = (patch: Partial<typeof fac>) =>
    setHospitalData((prev) =>
      prev ? { ...prev, facility: { ...prev.facility, ...patch } } : null,
    );

  const updateBeds = (patch: Partial<typeof fac.bedCapacity>) =>
    setHospitalData((prev) =>
      prev
        ? {
            ...prev,
            facility: {
              ...prev.facility,
              bedCapacity: { ...prev.facility.bedCapacity, ...patch },
            },
          }
        : null,
    );

  const updateContact = (patch: Partial<typeof fac.contactInfo>) =>
    setHospitalData((prev) =>
      prev
        ? {
            ...prev,
            facility: {
              ...prev.facility,
              contactInfo: { ...prev.facility.contactInfo, ...patch },
            },
          }
        : null,
    );

  return (
    <>
      <ProfileSection
        icon={<Building2 size={22} />}
        title="Facility infrastructure"
        description="Hospital identity and clinical capacity"
        color="primary"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Input
            label="Facility name"
            value={fac?.name || ""}
            onChange={(e) => updateFacility({ name: e.target.value })}
            placeholder="e.g. City Central Hospital"
          />
          <Input
            label="Department / office"
            value={hospitalData.department || ""}
            onChange={(e) =>
              setHospitalData((prev) =>
                prev ? { ...prev, department: e.target.value } : null,
              )
            }
            placeholder="e.g. Administration"
          />
          <Input
            label="Total bed capacity"
            type="number"
            value={String(fac?.bedCapacity?.total ?? "")}
            onChange={(e) =>
              updateBeds({ total: parseInt(e.target.value, 10) || 0 })
            }
          />
          <Input
            label="General available"
            type="number"
            value={String(fac?.bedCapacity?.generalAvailable ?? "")}
            onChange={(e) =>
              updateBeds({
                generalAvailable: parseInt(e.target.value, 10) || 0,
              })
            }
          />
          <div className="md:col-span-2">
            <Input
              label="ICU available"
              type="number"
              value={String(fac?.bedCapacity?.icuAvailable ?? "")}
              onChange={(e) =>
                updateBeds({
                  icuAvailable: parseInt(e.target.value, 10) || 0,
                })
              }
            />
          </div>
        </div>
      </ProfileSection>

      <ProfileSection
        icon={<Mail size={22} />}
        title="Contact & location"
        description="Lines patients and staff use to reach the facility"
        color="emerald"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Input
            label="General phone"
            value={fac?.contactInfo?.phone || ""}
            onChange={(e) => updateContact({ phone: e.target.value })}
          />
          <Input
            label="Official email"
            value={fac?.contactInfo?.email || ""}
            onChange={(e) => updateContact({ email: e.target.value })}
          />
          <Input
            label="Facility type"
            value={fac?.facilityType || ""}
            disabled
          />
          <Input
            label="Province"
            value={fac?.address?.province || ""}
            disabled
            icon={<MapPin size={16} />}
          />
        </div>
      </ProfileSection>
    </>
  );
}
