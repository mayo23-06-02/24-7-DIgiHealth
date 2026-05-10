"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  BiUser,
  BiShieldQuarter,
  BiBell,
  BiWallet,
  BiClipboard,
  BiCamera,
  BiCheckCircle,
  BiLoaderAlt,
  BiMobileAlt,
  BiEnvelope,
  BiLockAlt,
  BiDevices,
  BiTrash,
  BiCreditCard,
  BiBuilding,
  BiPlus,
  BiFirstAid,
  BiCertification,
  BiBriefcase,
  BiFile,
  BiDownload,
  BiX,
  BiEditAlt,
  BiUpload,
  BiImage,
} from "react-icons/bi";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Toast from "@/components/ui/Toast";

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

// ─── COMPONENT ──────────────────────────────────────────────────────────────

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
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileRes, roleDataRes, notifsRes, devicesRes, docsRes] =
        await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/user/role-data"),
          fetch("/api/user/notifications"),
          fetch("/api/user/devices"),
          fetch("/api/user/documents"),
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
        <h1 className="text-sm font-bold text-slate-500  animate-pulse">
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
    { id: "billing", label: "Treasury", icon: BiWallet },
    { id: "privacy", label: "POPIA", icon: BiClipboard },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 pb-20 max-w-[1800px] mx-auto">
      {/* ── PROFILE HERO ─────────────────────────────────────────────── */}
      <section className="relative group">
        <div className="h-64 md:h-80 w-full bg-primary rounded-lg overflow-hidden relative  shadow-slate-900/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-black/60 opacity-60" />
          <div className="absolute inset-0 backdrop-blur-[1px]" />
          <div className="absolute top-0 right-0 w-full h-full">
            <div className="absolute top-10 right-10 w-64 h-64 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-10 left-10 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full" />
          </div>

          <div className="absolute bottom-10 left-10 right-10 flex flex-col md:flex-row items-end justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* Hidden file inputs */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <input
                ref={docInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={handleDocUpload}
              />
              <div className="relative group/avatar">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg flex items-center justify-center bg-white p-1  overflow-hidden ring-4 ring-white/10 group-hover/avatar:scale-105 transition-transform duration-500">
                  <Avatar
                    name={fullName}
                    src={user.avatarUrl || undefined}
                    size="xl"
                  />
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center  border-4 border-slate-900 hover:scale-110 active:scale-95 transition-all disabled:opacity-60"
                >
                  {isUploadingDoc ? (
                    <BiLoaderAlt size={18} className="animate-spin" />
                  ) : (
                    <BiCamera size={18} />
                  )}
                </button>
              </div>
              <div className="mb-2">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight font-grotesk">
                    {fullName}
                  </h1>
                </div>
                <div className="flex items-center gap-4 text-white/60 text-xs font-bold ">
                  <span className="flex items-center gap-1.5">
                    <BiBriefcase className="text-white" />
                    {currentRole === "hospital_admin" &&
                    hospitalData?.facility?.name
                      ? hospitalData.facility.name
                      : user.role.replace("_", " ")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BiShieldQuarter className="text-white" />
                    {user.mfaEnabled ? "MFA SECURE" : "MFA PENDING"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pb-2">
              <Button
                onClick={() => {
                  if (activeTab === "notifications") handleSaveNotifications();
                  else if (activeTab === "role-data") handleSaveRoleData();
                  else handleSaveProfile();
                }}
                disabled={isSaving}
                className="rounded-2xl h-14 px-8  shadow-primary/30"
              >
                {isSaving ? (
                  <BiLoaderAlt className="animate-spin mr-2" />
                ) : (
                  <BiCheckCircle className="mr-2" />
                )}
                {isSaving ? "Synchronizing..." : "Commit Updates"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMMAND NAV ─────────────────────────────────────────────── */}
      <section className="flex flex-wrap items-center gap-2 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-4 rounded-lg font-bold  transition-all border ${
              activeTab === tab.id
                ? "bg-primary text-white border-primary "
                : " text-slate-600 bg-slate-200 border-slate-100 hover:border-primary/40 hover:text-primary "
            }`}
          >
            <tab.icon size={18} />
            <h4 className="text-">{tab.label}</h4>
          </button>
        ))}
      </section>

      {/* ── MAIN CONTENT GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-6">
          {/* Identity Section */}
          {activeTab === "general" && (
            <Card className="p-8 space-y-8 rounded-lg border-slate-100  shadow-slate-900/5 animate-in slide-in-from-left-4 duration-500">
              <SectionHead
                icon={<BiUser size={24} />}
                title="Biological Identity"
                sub="Primary account coordinates and access keys"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <Input
                  label="First Name"
                  value={user.firstName}
                  onChange={(e) =>
                    setUser({ ...user, firstName: e.target.value })
                  }
                  className="bg-slate-50/50 border-slate-100 focus:bg-white transition-all"
                />
                <Input
                  label="Last Name"
                  value={user.lastName}
                  onChange={(e) =>
                    setUser({ ...user, lastName: e.target.value })
                  }
                  className="bg-slate-50/50 border-slate-100 focus:bg-white"
                />
                <Input
                  label="Mobile Connectivity"
                  icon={<BiMobileAlt />}
                  value={user.mobile}
                  onChange={(e) => setUser({ ...user, mobile: e.target.value })}
                  placeholder="+27 XX XXX XXXX"
                  className="bg-slate-50/50 border-slate-100 focus:bg-white"
                />
                <Input
                  label="Verified Email"
                  icon={<BiEnvelope />}
                  value={user.email}
                  disabled
                  className="opacity-60 bg-slate-100 border-slate-200 cursor-not-allowed font-medium"
                />
                <Input
                  label="National Identification"
                  value={user.saId || "LOCKED / ENCRYPTED"}
                  disabled
                  className="opacity-60 bg-slate-100 border-slate-200 cursor-not-allowed"
                />
              </div>
              <div className="flex justify-end mt-8 pt-6 border-t border-slate-50">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="h-14 rounded-2xl px-10 text-sm font-bold bg-primary text-white "
                >
                  {isSaving ? (
                    <BiLoaderAlt className="animate-spin" size={20} />
                  ) : (
                    "Synchronize Identity"
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Clinical/Practice Data */}
          {activeTab === "role-data" && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
              {currentRole === "patient" && patientData && (
                <>
                  <Card className="p-8 space-y-8 rounded-lg border-slate-100  shadow-slate-900/5">
                    <SectionHead
                      icon={<BiCreditCard size={24} />}
                      title="Clinical Coverage"
                      sub="Medical aid and insurance synchronization"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <Input
                        label="Scheme Provider"
                        value={patientData.medicalAid.provider}
                        onChange={(e) =>
                          setPatientData({
                            ...patientData,
                            medicalAid: {
                              ...patientData.medicalAid,
                              provider: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g. Discovery"
                      />
                      <Input
                        label="Plan Classification"
                        value={patientData.medicalAid.planName}
                        onChange={(e) =>
                          setPatientData({
                            ...patientData,
                            medicalAid: {
                              ...patientData.medicalAid,
                              planName: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g. Executive"
                      />
                      <Input
                        label="Member Identification"
                        value={patientData.medicalAid.memberNumber}
                        onChange={(e) =>
                          setPatientData({
                            ...patientData,
                            medicalAid: {
                              ...patientData.medicalAid,
                              memberNumber: e.target.value,
                            },
                          })
                        }
                        className="md:col-span-2"
                      />
                    </div>
                  </Card>
                  <Card className="p-8 space-y-8 rounded-lg border-slate-100  shadow-slate-900/5">
                    <SectionHead
                      icon={<BiFirstAid size={24} />}
                      title="Emergency Proxies"
                      sub="Primary contact for critical clinical events"
                      color="rose"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Input
                        label="Proxy Name"
                        value={patientData.emergencyContact.name}
                        onChange={(e) =>
                          setPatientData({
                            ...patientData,
                            emergencyContact: {
                              ...patientData.emergencyContact,
                              name: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        label="Direct Line"
                        value={patientData.emergencyContact.phone}
                        onChange={(e) =>
                          setPatientData({
                            ...patientData,
                            emergencyContact: {
                              ...patientData.emergencyContact,
                              phone: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        label="Kinship"
                        value={patientData.emergencyContact.relationship}
                        onChange={(e) =>
                          setPatientData({
                            ...patientData,
                            emergencyContact: {
                              ...patientData.emergencyContact,
                              relationship: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </Card>
                </>
              )}

              {currentRole === "practitioner" && practitionerData && (
                <>
                  <Card className="p-8 space-y-8 rounded-lg border-slate-100  shadow-slate-900/5">
                    <SectionHead
                      icon={<BiBuilding size={24} />}
                      title="Revenue Disbursement"
                      sub="Commercial banking and tax integration"
                      color="emerald"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <Input
                        label="Account Holder"
                        value={practitionerData.bankAccount.accountHolder}
                        onChange={(e) =>
                          setPractitionerData({
                            ...practitionerData,
                            bankAccount: {
                              ...practitionerData.bankAccount,
                              accountHolder: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        label="Banking Institution"
                        value={practitionerData.bankAccount.bankName}
                        onChange={(e) =>
                          setPractitionerData({
                            ...practitionerData,
                            bankAccount: {
                              ...practitionerData.bankAccount,
                              bankName: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        label="Account Reference"
                        value={practitionerData.bankAccount.accountNumber}
                        onChange={(e) =>
                          setPractitionerData({
                            ...practitionerData,
                            bankAccount: {
                              ...practitionerData.bankAccount,
                              accountNumber: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        label="Branch/Tax ID"
                        value={practitionerData.bankAccount.branchCode}
                        onChange={(e) =>
                          setPractitionerData({
                            ...practitionerData,
                            bankAccount: {
                              ...practitionerData.bankAccount,
                              branchCode: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </Card>
                  <Card className="p-8 space-y-8 rounded-lg border-slate-100  ">
                    <SectionHead
                      icon={<BiCertification size={24} />}
                      title="Clinical Protocol"
                      sub="HPCSA validation and professional bio"
                    />
                    <div className="p-8 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-primary  border border-primary/10">
                          <BiClipboard size={32} />
                        </div>
                        <div>
                          <h1 className="text-xl font-bold text-slate-800 font-grotesk">
                            {practitionerData.hpcsaNumber}
                          </h1>
                          <p className="text-sm  text-slate-500 ">
                            HPCSA Registration
                          </p>
                        </div>
                      </div>
                      {practitionerData.hpcsaVerified ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 px-6 py-3 rounded-2xl border border-emerald-500/20">
                          <BiCheckCircle
                            className="text-emerald-500"
                            size={20}
                          />
                          <h1 className="text-xs font-bold text-emerald-600 st">
                            Verified
                          </h1>
                        </div>
                      ) : (
                        <Badge label="Verification Pending" status="warning" />
                      )}
                    </div>
                  </Card>
                </>
              )}

              {currentRole === "hospital_admin" && hospitalData && (
                <>
                  <Card className="p-8 space-y-8 rounded-lg border-slate-100  shadow-slate-900/5">
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
                          setHospitalData({
                            ...hospitalData,
                            facility: {
                              ...hospitalData.facility,
                              name: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g. City Central Hospital"
                      />
                      <Input
                        label="Department / Office"
                        value={hospitalData.department}
                        onChange={(e) =>
                          setHospitalData({
                            ...hospitalData,
                            department: e.target.value,
                          })
                        }
                        placeholder="e.g. Administration"
                      />
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input
                          label="Total Bed Capacity"
                          type="number"
                          value={hospitalData.facility.bedCapacity.total}
                          onChange={(e) =>
                            setHospitalData({
                              ...hospitalData,
                              facility: {
                                ...hospitalData.facility,
                                bedCapacity: {
                                  ...hospitalData.facility.bedCapacity,
                                  total: parseInt(e.target.value) || 0,
                                },
                              },
                            })
                          }
                        />
                        <Input
                          label="General Available"
                          type="number"
                          value={
                            hospitalData.facility.bedCapacity.generalAvailable
                          }
                          onChange={(e) =>
                            setHospitalData({
                              ...hospitalData,
                              facility: {
                                ...hospitalData.facility,
                                bedCapacity: {
                                  ...hospitalData.facility.bedCapacity,
                                  generalAvailable:
                                    parseInt(e.target.value) || 0,
                                },
                              },
                            })
                          }
                        />
                        <Input
                          label="ICU Available"
                          type="number"
                          value={hospitalData.facility.bedCapacity.icuAvailable}
                          onChange={(e) =>
                            setHospitalData({
                              ...hospitalData,
                              facility: {
                                ...hospitalData.facility,
                                bedCapacity: {
                                  ...hospitalData.facility.bedCapacity,
                                  icuAvailable: parseInt(e.target.value) || 0,
                                },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-8 space-y-8 rounded-lg border-slate-100  shadow-slate-900/5">
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
                          setHospitalData({
                            ...hospitalData,
                            facility: {
                              ...hospitalData.facility,
                              contactInfo: {
                                ...hospitalData.facility.contactInfo,
                                phone: e.target.value,
                              },
                            },
                          })
                        }
                      />
                      <Input
                        label="Official Email"
                        value={hospitalData.facility.contactInfo.email}
                        onChange={(e) =>
                          setHospitalData({
                            ...hospitalData,
                            facility: {
                              ...hospitalData.facility,
                              contactInfo: {
                                ...hospitalData.facility.contactInfo,
                                email: e.target.value,
                              },
                            },
                          })
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
              )}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveRoleData}
                  disabled={isSaving}
                  className="h-14 rounded-2xl px-10 text-sm font-bold bg-primary text-white "
                >
                  {isSaving ? (
                    <BiLoaderAlt className="animate-spin" size={20} />
                  ) : (
                    "Save Configuration"
                  )}
                </Button>
              </div>
            </div>
          )}
          {activeTab === "documents" && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <SectionHead
                  icon={<BiFile size={24} />}
                  title="Document Repository"
                  sub="Manage clinical records and identity assets"
                />
                <Button
                  onClick={() => docInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="rounded-2xl px-8 h-14 bg-primary text-white  flex items-center gap-2"
                >
                  {isUploadingDoc ? (
                    <BiLoaderAlt className="animate-spin" size={20} />
                  ) : (
                    <BiUpload size={20} />
                  )}
                  Upload Document
                </Button>
              </div>

              {documents.length === 0 ? (
                <Card className="p-20 flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-100 bg-slate-50/30">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-6 ">
                    <BiUpload size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 font-grotesk mb-2">
                    No documents synchronized
                  </h3>
                  <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                    Upload your clinical reports, identity documents or medical
                    certificates for secure cloud access.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {documents.map((doc) => (
                    <Card
                      key={doc.id}
                      className="group p-6 bg-white border-slate-100  shadow-slate-900/5 hover: hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${doc.mimeType.startsWith("image/") ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-600"}`}
                        >
                          {doc.mimeType.startsWith("image/") ? (
                            <BiImage size={28} />
                          ) : (
                            <BiFile size={28} />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditDocId(doc.id);
                              setEditDocLabel(doc.type);
                            }}
                            className="p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                          >
                            <BiEditAlt size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <BiTrash size={18} />
                          </button>
                        </div>
                      </div>

                      {editDocId === doc.id ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            autoFocus
                            className="flex-1 bg-slate-50 border-none rounded-lg px-3 py-1 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                            value={editDocLabel}
                            onChange={(e) => setEditDocLabel(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleRenameDoc(doc.id)
                            }
                          />
                          <button
                            onClick={() => handleRenameDoc(doc.id)}
                            className="p-1.5 bg-emerald-500 text-white rounded-lg"
                          >
                            <BiCheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => setEditDocId(null)}
                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"
                          >
                            <BiX size={16} />
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-lg font-bold text-slate-800 truncate mb-1 pr-10">
                          {doc.type}
                        </h3>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                          {new Date(doc.createdAt).toLocaleDateString("en-ZA", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm font-bold text-primary uppercase tracking-widest hover:underline"
                        >
                          <BiDownload size={14} /> View File
                        </a>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Security & MFA */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
              <Card className="p-8 space-y-8 rounded-lg border-slate-100  shadow-slate-900/5">
                <SectionHead
                  icon={<BiLockAlt size={24} />}
                  title="Credential Rotation"
                  sub="Update your primary access password"
                  color="rose"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input
                    label="Active Password"
                    type="password"
                    className="bg-slate-50/50"
                    value={passwordState.currentPassword}
                    onChange={(e) =>
                      setPasswordState({
                        ...passwordState,
                        currentPassword: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="Target Password"
                    type="password"
                    className="bg-slate-50/50"
                    value={passwordState.newPassword}
                    onChange={(e) =>
                      setPasswordState({
                        ...passwordState,
                        newPassword: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="Confirm Target"
                    type="password"
                    className="bg-slate-50/50"
                    value={passwordState.confirmPassword}
                    onChange={(e) =>
                      setPasswordState({
                        ...passwordState,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <Button
                  onClick={handleSavePassword}
                  disabled={isSaving}
                  variant="outline"
                  className="h-14 rounded-2xl px-8 border-rose-100 text-rose-500 hover:bg-rose-50 font-bold st text-sm"
                >
                  {isSaving ? "Authorizing..." : "Authorize Rotation"}
                </Button>
              </Card>

              <Card className="p-8 space-y-8 rounded-lg border-slate-100  shadow-slate-900/5">
                <SectionHead
                  icon={<BiDevices size={24} />}
                  title="Authorized Terminals"
                  sub="Active sessions and trusted hardware"
                  color="blue"
                />
                <div className="space-y-4">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="group p-6 bg-slate-50/50 rounded-lg border border-slate-100 flex items-center justify-between hover:bg-white hover: transition-all duration-500"
                    >
                      <div className="flex items-center gap-5">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${device.active ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-200 text-slate-500"}`}
                        >
                          <BiDevices size={24} />
                        </div>
                        <div>
                          <h1 className="text-sm font-bold text-slate-800">
                            {device.name}
                          </h1>
                          <p className="text-sm font-bold text-slate-500 ">
                            LAST USED: {device.lastUsed}
                          </p>
                        </div>
                      </div>
                      {!device.active && (
                        <Button
                          variant="ghost"
                          onClick={() => handleRevokeDevice(device.id)}
                          className="w-12 h-12 p-0 rounded-2xl bg-transparent border-none text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                        >
                          <BiTrash size={20} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <Card className="p-8 space-y-8  border-slate-100  shadow-slate-900/5 animate-in slide-in-from-left-4 duration-500">
              <SectionHead
                icon={<BiBell size={24} />}
                title="Neural Alerts"
                sub="Synchronization channels for clinical events"
              />
              <div className="space-y-4">
                {(
                  [
                    {
                      key: "email",
                      label: "Email",
                      sub: "Reports, billing, and permanent records",
                      icon: BiEnvelope,
                    },
                    {
                      key: "push",
                      label: "Real-time Push",
                      sub: "Instant clinical consultation signals",
                      icon: BiShieldQuarter,
                    },
                    {
                      key: "sms",
                      label: "Mobile SMS",
                      sub: "High-priority emergency bypass",
                      icon: BiMobileAlt,
                    },
                  ] as const
                ).map((notif) => (
                  <div
                    key={notif.key}
                    className="flex items-center justify-between p-8 bg-slate-50 rounded-lg border border-slate-100 group hover:bg-white hover: transition-all duration-500"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-slate-100   rounded-lg flex items-center justify-center text-primary group-hover:text-primary transition-all  border border-slate-50">
                        <notif.icon size={26} />
                      </div>
                      <div>
                        <h1 className="text-md font-bold text-slate-800">
                          {notif.label}
                        </h1>
                        <p className="text-sm  text-slate-600 ">{notif.sub}</p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setNotifications({
                          ...notifications,
                          [notif.key]: !notifications[notif.key],
                        })
                      }
                      className={`w-16 h-9 rounded-full transition-all relative shrink-0 ${notifications[notif.key] ? "bg-primary " : "bg-slate-200"}`}
                    >
                      <div
                        className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${notifications[notif.key] ? "left-8.5" : "left-1.5"}`}
                      />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-8 pt-6 border-t border-slate-50">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={isSaving}
                  className="h-14 rounded-2xl px-10 text-sm font-bold bg-primary text-white "
                >
                  {isSaving ? (
                    <BiLoaderAlt className="animate-spin" size={20} />
                  ) : (
                    "Save Preferences"
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Billing / POPIA */}
          {activeTab === "billing" && (
            <Card className="p-12 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden  shadow-slate-900/40 animate-in slide-in-from-left-4 duration-500">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[140px] rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
              <div className="relative z-10 space-y-10">
                <div>
                  <h1 className="text-sm  text-primary   mb-4">
                    Current Subscription Architecture
                  </h1>
                  <h1 className="text-4xl text-gray-800 md:text-5xl font-bold tracking-tighter font-grotesk">
                    {currentRole === "patient" && patientData
                      ? `${patientData.subscriptionTier} Clinical`
                      : "Professional"}{" "}
                    Access
                  </h1>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant="white"
                    className="h-16 rounded-[1.5rem] px-10 text-xs font-bold st text-slate-900 "
                  >
                    Cancel Subscription
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-16 rounded-[1.5rem] px-10 text-xs font-bold st text-white/50 border-white/10 hover:text-white hover:bg-white/5"
                  >
                    Billing Ledger
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "privacy" && (
            <Card className="p-8 space-y-8 rounded-lg border-slate-100  shadow-slate-900/5 animate-in slide-in-from-left-4 duration-500">
              <SectionHead
                icon={<BiClipboard size={24} />}
                title="Compliance Directive"
                sub="POPIA and data lifecycle parameters"
                color="blue"
              />
              <div className="p-10 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-lg font-bold text-slate-800 font-grotesk">
                      Active Consent Hash
                    </h1>
                    <p className="text-sm font-bold text-slate-500 ">
                      Verified: April 2026
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-500 px-6 py-2 rounded-2xl border border-emerald-500/20 text-sm font-bold st">
                    Compliant
                  </div>
                </div>
                <p className="text-sm text-slate-500 italic leading-relaxed font-medium">
                  "I hereby authorize 24/7 DigiHealth to process my clinical and
                  biometric data in accordance with the Protection of Personal
                  Information Act (POPIA)."
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="outline"
                  className="h-14 rounded-2xl px-8 text-sm font-bold st"
                >
                  Download Policy
                </Button>
                <Button
                  variant="ghost"
                  className="h-14 rounded-2xl px-8 text-sm font-bold st text-primary hover:bg-primary/5"
                >
                  Data Access Logs
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* ── SIDEBAR STATS ────────────────────────────────────────────── */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="p-8 rounded-lg bg-white border-slate-100  shadow-slate-900/5 sticky top-8">
            <h1 className="text-xs font-bold text-slate-500 uppercase  mb-6">
              Profile Health
            </h1>
            <div className="space-y-6">
              {[
                { label: "Identity", val: 100, color: "bg-emerald-500" },
                { label: "Clinical", val: 85, color: "bg-primary" },
                { label: "Security", val: 70, color: "bg-amber-500" },
              ].map((stat) => (
                <div key={stat.label} className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-bold st">
                    <span className="text-slate-500">
                      {stat.label} Verification
                    </span>
                    <span className="text-slate-900">{stat.val}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stat.color} transition-all duration-1000`}
                      style={{ width: `${stat.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-slate-50">
              <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-primary ">
                  <BiCheckCircle size={20} />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-500 st mb-0.5">
                    Integrity Score
                  </h1>
                  <h1 className="text-sm font-bold text-slate-800">
                    High Reliability
                  </h1>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-8 rounded-lg bg-gradient-to-br from-primary/70 to-gray-400 text-white  shadow-primary/20">
            <h1 className="text-lg font-bold font-grotesk mb-2">
              Need Assistance?
            </h1>
            <p className="text-xs text-white/70 mb-6 leading-relaxed">
              Our support team can help you with complex clinical configurations
              or identity verification.
            </p>
            <Button
              variant="white"
              fullWidth
              className="h-14 rounded-2xl text-sm font-bold st text-primary "
            >
              Open Support Ticket
            </Button>
          </Card>
        </div>
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

// ─── LOCAL HELPERS ────────────────────────────────────────────────────────────
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
        className={`w-14 h-14 rounded-xl flex items-center justify-center  ${colorMap[color] || colorMap.primary}`}
      >
        {icon}
      </div>
      <div className="gap-1 flex flex-col">
        <h4 className="text-xl font-bold text-slate-800 tracking-tight font-grotesk">
          {title}
        </h4>
        <p className="text-xs text-slate-600  uppercase opacity-70">{sub}</p>
      </div>
    </div>
  );
}
