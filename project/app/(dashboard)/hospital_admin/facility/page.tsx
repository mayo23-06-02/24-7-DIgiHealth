"use client";

import React, { useRef, useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageHeader from "@/components/ui/PageHeader";
import { Save, Loader2, ImagePlus } from "lucide-react";

export default function FacilitySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [facility, setFacility] = useState<any>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    facilityType: "Public",
    street: "",
    city: "",
    province: "",
    phone: "",
    emergencyPhone: "",
    email: "",
    totalBeds: 0,
    generalAvailable: 0,
    icuAvailable: 0,
    isOpen: true,
    emergencyServices: false,
    specialties: "",
  });

  const fetchFacility = async () => {
    try {
      const res = await fetch("/api/hospital/facility");
      const json = await res.json();
      if (json.success && json.data) {
        setFacility(json.data);
        setFormData({
          name: json.data.name || "",
          facilityType: json.data.facilityType || "Public",
          street: json.data.address?.street || "",
          city: json.data.address?.city || "",
          province: json.data.address?.province || "",
          phone: json.data.contactInfo?.phone || "",
          emergencyPhone: json.data.contactInfo?.emergencyPhone || "",
          email: json.data.contactInfo?.email || "",
          totalBeds: json.data.bedCapacity?.total || 0,
          generalAvailable: json.data.bedCapacity?.generalAvailable || 0,
          icuAvailable: json.data.bedCapacity?.icuAvailable || 0,
          isOpen: json.data.isOpen !== false,
          emergencyServices: !!json.data.emergencyServices,
          specialties: (json.data.specialties || []).join(", "),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacility();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const saveFacility = async () => {
    setSaving(true);
    try {
      const body = {
        name: formData.name,
        facilityType: formData.facilityType,
        address: {
          street: formData.street,
          city: formData.city,
          province: formData.province,
        },
        contactInfo: {
          phone: formData.phone,
          emergencyPhone: formData.emergencyPhone,
          email: formData.email,
        },
        bedCapacity: {
          total: Number(formData.totalBeds) || 0,
          generalAvailable: Number(formData.generalAvailable) || 0,
          icuAvailable: Number(formData.icuAvailable) || 0,
        },
        isOpen: formData.isOpen,
        emergencyServices: formData.emergencyServices,
        specialties: formData.specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const res = await fetch("/api/hospital/facility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setFacility(json.data);
        toast.success("Facility details saved successfully.");
      } else {
        toast.error(json.error || "Failed to save facility details.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save facility details.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG or PNG).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/hospital/facility/logo", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Upload failed");
      }
      setFacility((prev: any) => ({ ...prev, logo: json.data.url }));
      toast.success("Facility photo updated.");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="w-full pb-10 flex flex-col gap-6 max-w-4xl mx-auto">
      <PageHeader
        title="Facility Settings"
        subtitle="Manage hospital details and capacities"
        right={
          <Button
            onClick={saveFacility}
            disabled={saving}
            loading={saving}
            icon={<Save size={18} />}
            iconPosition="left"
            className="!rounded-lg !max-w-none normal-case !tracking-normal"
          >
            Save Changes
          </Button>
        }
      />

      <Card className="flex flex-col gap-6">
        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 font-grotesk">
          General Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Facility Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
          <Select
            label="Facility Type"
            value={formData.facilityType}
            onChange={(value) => setFormData({ ...formData, facilityType: value })}
            options={[
              { value: "Public", label: "Public" },
              { value: "Private", label: "Private" },
              { value: "NGO", label: "NGO" },
            ]}
          />
          <Input
            label="Street"
            name="street"
            value={formData.street}
            onChange={handleChange}
          />
          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleChange}
          />
          <Input
            label="Province"
            name="province"
            value={formData.province}
            onChange={handleChange}
          />
          <Input
            label="Contact Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
          <Input
            label="Emergency Number"
            name="emergencyPhone"
            value={formData.emergencyPhone}
            onChange={handleChange}
          />
          <Input
            label="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mt-4 font-grotesk">
          Bed Capacity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            type="number"
            label="Total Beds"
            name="totalBeds"
            value={formData.totalBeds}
            onChange={handleChange}
          />
          <Input
            type="number"
            label="General Available"
            name="generalAvailable"
            value={formData.generalAvailable}
            onChange={handleChange}
          />
          <Input
            type="number"
            label="ICU Available"
            name="icuAvailable"
            value={formData.icuAvailable}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="isOpen"
            checked={formData.isOpen}
            onChange={handleChange}
            className="w-4 h-4 text-primary rounded border-slate-300"
          />
          <label className="text-sm font-bold text-slate-700">Facility is open</label>
        </div>

        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mt-4 font-grotesk">
          Services Offered
        </h3>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="emergencyServices"
              checked={formData.emergencyServices}
              onChange={handleChange}
              className="w-4 h-4 text-primary rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Emergency services</span>
          </label>
          <Input
            label="Specialties"
            name="specialties"
            value={formData.specialties}
            onChange={handleChange}
            helperText="Comma-separated, e.g. Cardiology, Neurosurgery, Oncology"
          />
        </div>

        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mt-4 font-grotesk">
          Media
        </h3>
        <div className="flex items-center gap-4">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            className="w-32 h-32 shrink-0 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-200 hover:text-primary transition-colors overflow-hidden disabled:opacity-60"
          >
            {uploadingLogo ? (
              <Loader2 className="animate-spin" size={28} />
            ) : facility?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={facility.logo} alt="Facility" className="w-full h-full object-cover" />
            ) : (
              <>
                <ImagePlus size={32} />
                <span className="text-xs font-bold mt-2">Upload Photo</span>
              </>
            )}
          </button>
          <div className="flex-1 bg-slate-50 border border-slate-100 p-4 rounded-lg text-sm text-slate-500">
            Upload a cover image representing your facility. Supported formats:
            .JPG, .PNG, .WEBP. Max size: 5MB.
          </div>
        </div>
      </Card>
    </div>
  );
}
