"use client";
import React from "react";
import DocumentUpload from "@/components/ui/DocumentUpload";

export default function HospitalStep4({ formData, updateData }: any) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <DocumentUpload
        label="Facility Profile Logo *"
        description="Select or drag a professional logo for the facility (Square recommended)"
        value={formData.facilityLogo}
        onUploadComplete={(url) => updateData("facilityLogo", url)}
      />

      <DocumentUpload
        label="Facility Wallpaper *"
        description="Select or drag a high-resolution wallpaper"
        value={formData.facilityWallpaper}
        onUploadComplete={(url) => updateData("facilityWallpaper", url)}
      />

      <DocumentUpload
        label="Registration Certificate (PDF) *"
        description="Upload a certified facility registration certificate"
        accept="application/pdf"
        value={formData.regCertificate}
        onUploadComplete={(url) => updateData("regCertificate", url)}
      />
    </div>
  );
}
