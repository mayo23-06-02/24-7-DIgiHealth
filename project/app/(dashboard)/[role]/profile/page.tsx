"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
  BiUser,
  BiShieldQuarter,
  BiBell,
  BiWallet,
  BiBriefcase,
  BiFile,
  BiLoaderAlt,
} from "react-icons/bi";

import Toast from "@/components/ui/Toast";

// Components
import ProfileHero from "./components/ProfileHero";
import ProfileNavigation from "./components/ProfileNavigation";
import IdentityTab from "./components/IdentityTab";
import RoleDataTab from "./components/RoleDataTab";
const DocumentsTab = dynamic(() => import("./components/DocumentsTab"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <BiLoaderAlt className="animate-spin text-primary" size={32} />
    </div>
  ),
});
import SecurityTab from "./components/SecurityTab";
import NotificationsTab from "./components/NotificationsTab";
import BillingTab from "./components/BillingTab";
import ProfileSidebar from "./components/ProfileSidebar";

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  saId: string;
  role: string;
  mfaEnabled: boolean;
  avatarUrl: string | null;
  status: string;
}

interface PatientRoleData {
  medicalAid: { provider: string; planName: string; memberNumber: string };
  emergencyContact: { name: string; phone: string; relationship: string };
  subscriptionTier: string;
  dateOfBirth?: string;
  gender?: string;
}

interface PractitionerRoleData {
  specialisation: string;
  hpcsaNumber: string;
  experienceYears: number;
  bio: string;
  languages: string[];
  acceptedMedicalAids: string[];
  bankAccount: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    branchCode: string;
    taxNumber: string;
  };
  hpcsaVerified: boolean;
  rating: number;
  reviewCount: number;
}

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

interface Device {
  id: string;
  name: string;
  lastUsed: string;
  active: boolean;
}

interface UserDocument {
  id: string;
  type: string;
  url: string;
  mimeType: string;
  status: string;
  createdAt: string;
}

interface NotifPrefs {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export default function ProfilePage() {
  const { role } = useParams();
  const currentRole = (role as string) || "patient";

  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [editDocLabel, setEditDocLabel] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [patientData, setPatientData] = useState<PatientRoleData | null>(null);
  const [practitionerData, setPractitionerData] =
    useState<PractitionerRoleData | null>(null);
  const [hospitalData, setHospitalData] =
    useState<HospitalAdminRoleData | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [notifications, setNotifications] = useState<NotifPrefs>({
    email: true,
    push: true,
    sms: false,
  });

  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [billingData, setBillingData] = useState<any>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileRes, roleDataRes, notifsRes, devicesRes, docsRes, billingRes] =
        await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/user/role-data"),
          fetch("/api/user/notifications"),
          fetch("/api/user/devices"),
          fetch("/api/user/documents"),
          fetch("/api/billing"),
        ]);

      if (profileRes.ok) {
        const d = await profileRes.json();
        setUser(d.data);
      }
      if (notifsRes.ok) {
        const d = await notifsRes.json();
        setNotifications(d.data);
      }
      if (devicesRes.ok) {
        const d = await devicesRes.json();
        setDevices(d.data || []);
      }
      if (roleDataRes.ok) {
        const d = await roleDataRes.json();
        if (currentRole === "patient") setPatientData(d.data);
        else if (currentRole === "practitioner") setPractitionerData(d.data);
        else if (currentRole === "hospital_admin") setHospitalData(d.data);
      }
      if (docsRes.ok) {
        const d = await docsRes.json();
        setDocuments(d.data || []);
      }
      if (billingRes.ok) {
        const d = await billingRes.json();
        setBillingData(d);
      }
    } catch (err) {
      console.error("Failed to load profile data", err);
    }
    setIsLoading(false);
  }, [currentRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: user.firstName,
          lastName: user.lastName,
          mobile: user.mobile,
          mfaEnabled: user.mfaEnabled,
        }),
      });
      if (res.ok) {
        setToast({
          message: "Profile synchronized successfully.",
          type: "success",
        });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setIsSaving(false);
  };

  const handleSaveRoleData = async () => {
    setIsSaving(true);
    try {
      const body =
        currentRole === "patient"
          ? {
              medicalAid: patientData?.medicalAid,
              emergencyContact: patientData?.emergencyContact,
            }
          : currentRole === "practitioner"
            ? {
                bankAccount: practitionerData?.bankAccount,
                bio: practitionerData?.bio,
                languages: practitionerData?.languages,
              }
            : {
                facility: hospitalData?.facility,
                department: hospitalData?.department,
              };
      const res = await fetch("/api/user/role-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setToast({
        message: res.ok ? "Configuration updated." : "Save failed.",
        type: res.ok ? "success" : "error",
      });
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setIsSaving(false);
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
      });
      setToast({ message: "Preferences updated.", type: "success" });
    } catch {
      setToast({ message: "Save error.", type: "error" });
    }
    setIsSaving(false);
  };

  const handleRevokeDevice = async (id: string) => {
    try {
      await fetch(`/api/user/devices/${id}`, { method: "DELETE" });
      setDevices((prev) => prev.filter((d) => d.id !== id));
      setToast({ message: "Device revoked.", type: "info" });
    } catch {
      setToast({ message: "Error.", type: "error" });
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast({ message: "Please select an image file.", type: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setIsUploadingDoc(true);
      try {
        const res = await fetch("/api/user/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl,
            mimeType: file.type,
            isAvatar: true,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setUser((prev) => (prev ? { ...prev, avatarUrl: dataUrl } : prev));
          setToast({ message: "Profile photo updated.", type: "success" });
        } else {
          setToast({ message: data.error || "Upload failed.", type: "error" });
        }
      } catch {
        setToast({ message: "Network error.", type: "error" });
      }
      setIsUploadingDoc(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setIsUploadingDoc(true);
      try {
        const res = await fetch("/api/user/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl,
            mimeType: file.type,
            type: file.type.startsWith("image/") ? "Image" : "Document",
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setDocuments((prev) => [data.data, ...prev]);
          setToast({
            message: `"${file.name}" uploaded successfully.`,
            type: "success",
          });
        } else {
          setToast({ message: data.error || "Upload failed.", type: "error" });
        }
      } catch {
        setToast({ message: "Network error.", type: "error" });
      }
      setIsUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/user/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setToast({ message: "File deleted.", type: "info" });
      } else {
        setToast({ message: "Delete failed.", type: "error" });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
  };

  const handleRenameDoc = async (id: string) => {
    if (!editDocLabel.trim()) return;
    try {
      const res = await fetch(`/api/user/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: editDocLabel.trim() }),
      });
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, type: editDocLabel.trim() } : d,
          ),
        );
        setEditDocId(null);
        setEditDocLabel("");
        setToast({ message: "Label updated.", type: "success" });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
  };

  const handleSavePassword = async () => {
    if (!passwordState.currentPassword || !passwordState.newPassword) {
      setToast({ message: "Please fill all password fields.", type: "error" });
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setToast({ message: "New passwords do not match.", type: "error" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordState.currentPassword,
          newPassword: passwordState.newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({
          message: "Credentials rotated successfully.",
          type: "success",
        });
        setPasswordState({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setToast({
          message: data.error || "Failed to update password.",
          type: "error",
        });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setIsSaving(false);
  };

  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <BiUser className="text-primary animate-pulse" size={24} />
          </div>
        </div>
        <h1 className="text-sm font-bold text-slate-500 animate-pulse">
          Accessing Neural Profile...
        </h1>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`;
  const tabs = [
    { id: "general", label: "Identity", icon: BiUser },
    {
      id: "role-data",
      label:
        currentRole === "patient"
          ? "Clinical"
          : currentRole === "hospital_admin"
            ? "Facility"
            : "Practice",
      icon: BiBriefcase,
    },
    { id: "documents", label: "Documents", icon: BiFile },
    { id: "security", label: "Security", icon: BiShieldQuarter },
    { id: "notifications", label: "Alerts", icon: BiBell },
    { id: "billing", label: "Subscriptions", icon: BiWallet },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 pb-20 max-w-[1800px] mx-auto">
      {/* ── PROFILE HERO ─────────────────────────────────────────────── */}
      <ProfileHero
        fullName={fullName}
        user={user}
        currentRole={currentRole}
        hospitalData={hospitalData}
        activeTab={activeTab}
        isUploadingDoc={isUploadingDoc}
        isSaving={isSaving}
        avatarInputRef={avatarInputRef}
        docInputRef={docInputRef}
        handleAvatarUpload={handleAvatarUpload}
        handleDocUpload={handleDocUpload}
        handleSaveNotifications={handleSaveNotifications}
        handleSaveRoleData={handleSaveRoleData}
        handleSaveProfile={handleSaveProfile}
      />

      {/* ── COMMAND NAV ─────────────────────────────────────────────── */}
      <ProfileNavigation
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* ── MAIN CONTENT GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-6">
          {activeTab === "general" && (
            <IdentityTab
              user={user}
              setUser={setUser}
              isSaving={isSaving}
              handleSaveProfile={handleSaveProfile}
            />
          )}

          {activeTab === "role-data" && (
            <RoleDataTab
              currentRole={currentRole}
              patientData={patientData}
              setPatientData={setPatientData}
              practitionerData={practitionerData}
              setPractitionerData={setPractitionerData}
              hospitalData={hospitalData}
              setHospitalData={setHospitalData}
              isSaving={isSaving}
              handleSaveRoleData={handleSaveRoleData}
            />
          )}

          {activeTab === "documents" && (
            <DocumentsTab
              documents={documents}
              setDocuments={setDocuments}
              isUploadingDoc={isUploadingDoc}
              docInputRef={docInputRef}
              handleDocUpload={handleDocUpload}
              handleDeleteDoc={handleDeleteDoc}
              handleRenameDoc={handleRenameDoc}
              editDocId={editDocId}
              setEditDocId={setEditDocId}
              editDocLabel={editDocLabel}
              setEditDocLabel={setEditDocLabel}
            />
          )}

          {activeTab === "security" && (
            <SecurityTab
              passwordState={passwordState}
              setPasswordState={setPasswordState}
              isSaving={isSaving}
              handleSavePassword={handleSavePassword}
              devices={devices}
              handleRevokeDevice={handleRevokeDevice}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsTab
              notifications={notifications}
              setNotifications={setNotifications}
              isSaving={isSaving}
              handleSaveNotifications={handleSaveNotifications}
            />
          )}

          {activeTab === "billing" && (
            <BillingTab
              currentRole={currentRole}
              patientData={patientData}
              billingData={billingData}
              setBillingData={setBillingData}
              setToast={setToast}
            />
          )}
        </div>

        {/* ── SIDEBAR STATS ────────────────────────────────────────────── */}
        <ProfileSidebar setToast={setToast} />
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
