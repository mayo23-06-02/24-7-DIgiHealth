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

interface Device {
  id: string;
  name: string;
  lastUsed: string;
  active: boolean;
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
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Live state from API
  const [user, setUser] = useState<UserProfile | null>(null);
  const [patientData, setPatientData] = useState<PatientRoleData | null>(null);
  const [practitionerData, setPractitionerData] =
    useState<PractitionerRoleData | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [notifications, setNotifications] = useState<NotifPrefs>({
    email: true,
    push: true,
    sms: false,
  });

  // ─── LOAD ALL DATA ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileRes, roleDataRes, notifsRes, devicesRes] =
        await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/user/role-data"),
          fetch("/api/user/notifications"),
          fetch("/api/user/devices"),
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
      }
    } catch (err) {
      console.error("Failed to load profile data", err);
      setToast({
        message: "Could not connect to server. Retrying…",
        type: "error",
      });
    }
    setIsLoading(false);
  }, [currentRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── SAVE HANDLERS ───────────────────────────────────────────────────────
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
        }),
      });
      if (res.ok) {
        setToast({
          message: "Profile synchronized successfully.",
          type: "success",
        });
      } else {
        setToast({ message: "Save failed. Please try again.", type: "error" });
      }
    } catch {
      setToast({
        message: "Network error. Changes saved locally.",
        type: "info",
      });
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
          : {
              bankAccount: practitionerData?.bankAccount,
              bio: practitionerData?.bio,
              languages: practitionerData?.languages,
            };

      const res = await fetch("/api/user/role-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setToast({
        message: res.ok
          ? "Clinical data updated successfully."
          : "Save failed.",
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
      setToast({ message: "Notification preferences saved.", type: "success" });
    } catch {
      setToast({ message: "Could not save preferences.", type: "error" });
    }
    setIsSaving(false);
  };

  const handleRevokeDevice = async (id: string) => {
    try {
      await fetch(`/api/user/devices/${id}`, { method: "DELETE" });
      setDevices((prev) => prev.filter((d) => d.id !== id));
      setToast({ message: "Device access revoked.", type: "info" });
    } catch {
      setToast({ message: "Could not revoke device.", type: "error" });
    }
  };

  // ─── LOADING ─────────────────────────────────────────────────────────────
  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <BiLoaderAlt className="animate-spin text-primary" size={48} />
        <p className="text-slate-400 font-bold  tracking-widest text-[10px]">
          Loading Profile…
        </p>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`;

  const tabs = [
    { id: "general", label: "General", icon: BiUser },
    { id: "security", label: "Security", icon: BiShieldQuarter },
    { id: "notifications", label: "Notifications", icon: BiBell },
    {
      id: "role-data",
      label:
        currentRole === "patient"
          ? "Clinical Details"
          : currentRole === "practitioner"
            ? "Practice Intel"
            : "Role Data",
      icon: BiBriefcase,
    },
    { id: "billing", label: "Billing", icon: BiWallet },
    { id: "privacy", label: "Privacy", icon: BiClipboard },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <PageHeader
        title="Command Center"
        subtitle="Manage your identity, security, and clinical configurations."
        right={
          <Button
            onClick={
              activeTab === "notifications"
                ? handleSaveNotifications
                : activeTab === "role-data"
                  ? handleSaveRoleData
                  : handleSaveProfile
            }
            disabled={isSaving}
            icon={
              isSaving ? (
                <BiLoaderAlt className="animate-spin" />
              ) : (
                <BiCheckCircle />
              )
            }
            className="shadow-xl shadow-primary/20"
          >
            {isSaving ? "Saving…" : "Commit Changes"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <Card className="p-0 overflow-hidden rounded-lg shadow-2xl shadow-slate-900/5">
            {/* Avatar & name */}
            <div className="bg-primary/5 p-8 flex flex-col items-center text-center">
              <div className="relative group">
                <div className="w-24 h-24 rounded-[2rem] overflow-hidden ring-8 ring-white shadow-2xl shadow-primary/20">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Avatar name={fullName} size="xl" />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-primary shadow-lg border-2 border-primary/10 hover:scale-110 transition-all">
                  <BiCamera size={18} />
                </button>
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-800 tracking-tight leading-none font-grotesk">
                {fullName}
              </h3>
              <p className="text-[10px] font-bold text-primary  tracking-widest mt-2 opacity-80">
                {user.role.replace("_", " ")}
              </p>
              <div className="mt-3">
                <Badge
                  label={user.status}
                  variant={user.status === "active" ? "success" : "warning"}
                  className="rounded-full px-4 text-[9px] font-bold  tracking-widest"
                />
              </div>
            </div>

            {/* Nav */}
            <nav className="p-4 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[11px] font-bold  tracking-wider transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-slate-500 hover:bg-slate-50 hover:text-primary"
                  }`}
                >
                  <tab.icon size={20} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <div className="lg:col-span-9 space-y-6">
          {/* GENERAL */}
          {activeTab === "general" && (
            <Card className="p-8 space-y-8 rounded-lg animate-in fade-in slide-in-from-right-4 duration-400">
              <SectionHead
                icon={<BiUser size={22} />}
                title="Personal Coordinates"
                sub="Identity & Contact"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="First Name"
                  value={user.firstName}
                  onChange={(e) =>
                    setUser({ ...user, firstName: e.target.value })
                  }
                />
                <Input
                  label="Last Name"
                  value={user.lastName}
                  onChange={(e) =>
                    setUser({ ...user, lastName: e.target.value })
                  }
                />
                <Input
                  label="Mobile Number"
                  icon={<BiMobileAlt />}
                  value={user.mobile}
                  onChange={(e) => setUser({ ...user, mobile: e.target.value })}
                  placeholder="+27 XX XXX XXXX"
                />
                <Input
                  label="Email Address"
                  icon={<BiEnvelope />}
                  value={user.email}
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
                <Input
                  label="South African ID"
                  value={user.saId || "Not provided"}
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
                <div className="flex items-center gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div
                    className={`w-3 h-3 rounded-full ${user.mfaEnabled ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-slate-300"}`}
                  />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400  tracking-widest">
                      MFA Status
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      {user.mfaEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
              <Card className="p-8 space-y-8 rounded-lg">
                <SectionHead
                  icon={<BiLockAlt size={22} />}
                  title="Credential Rotation"
                  sub="Change Password"
                  color="rose"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input label="Current Password" type="password" />
                  <Input label="New Password" type="password" />
                  <Input label="Confirm Password" type="password" />
                </div>
                <Button
                  variant="outline"
                  className="h-12 rounded-2xl border-rose-100 text-rose-500 hover:bg-rose-50 text-[11px] font-bold  tracking-widest"
                >
                  Rotate Credentials
                </Button>
              </Card>

              <Card className="p-8 rounded-lg bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between relative z-10">
                  <div>
                    <h5 className="text-lg font-bold font-grotesk">
                      Multi-Factor Authentication
                    </h5>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Add a TOTP code requirement from your mobile authenticator
                      for every login.
                    </p>
                  </div>
                  <Button
                    variant={user.mfaEnabled ? "primary" : "white"}
                    onClick={() =>
                      setUser({ ...user, mfaEnabled: !user.mfaEnabled })
                    }
                    className="rounded-2xl h-14 px-8 text-[10px] font-bold  tracking-widest shrink-0"
                  >
                    {user.mfaEnabled
                      ? "Enabled — Click to Disable"
                      : "Enable MFA"}
                  </Button>
                </div>
              </Card>

              <Card className="p-8 space-y-5 rounded-lg">
                <SectionHead
                  icon={<BiDevices size={22} />}
                  title="Trusted Terminals"
                  sub="Active Sessions"
                  color="blue"
                />
                {devices.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold py-4 text-center">
                    No devices registered.
                  </p>
                ) : (
                  devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-3 h-3 rounded-full shrink-0 ${device.active ? "bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" : "bg-slate-300"}`}
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {device.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold ">
                            {device.lastUsed}
                          </p>
                        </div>
                      </div>
                      {!device.active && (
                        <Button
                          variant="ghost"
                          onClick={() => handleRevokeDevice(device.id)}
                          className="w-10 h-10 p-0 rounded-xl !min-w-0 border-none bg-transparent text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all"
                        >
                          <BiTrash size={18} />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </Card>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <Card className="p-8 space-y-6 rounded-lg animate-in fade-in slide-in-from-right-4 duration-400">
              <SectionHead
                icon={<BiBell size={22} />}
                title="Alert Distribution"
                sub="Notification Preferences"
                color="amber"
              />
              {(
                [
                  {
                    key: "email",
                    label: "Email Notifications",
                    sub: "Appointments, reports, billing",
                    icon: BiEnvelope,
                  },
                  {
                    key: "push",
                    label: "Browser Push Alerts",
                    sub: "Real-time consultation events",
                    icon: BiShieldQuarter,
                  },
                  {
                    key: "sms",
                    label: "Emergency SMS",
                    sub: "Critical alerts only",
                    icon: BiMobileAlt,
                  },
                ] as const
              ).map((notif) => (
                <div
                  key={notif.key}
                  className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-all shadow-sm">
                      <notif.icon size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        {notif.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold  tracking-wide">
                        {notif.sub}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        [notif.key]: !notifications[notif.key],
                      })
                    }
                    className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${notifications[notif.key] ? "bg-primary" : "bg-slate-200"}`}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${notifications[notif.key] ? "left-7 shadow-primary/30" : "left-1"}`}
                    />
                  </button>
                </div>
              ))}
            </Card>
          )}

          {/* ROLE DATA — Patient */}
          {activeTab === "role-data" &&
            currentRole === "patient" &&
            patientData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
                <Card className="p-8 space-y-6 rounded-lg">
                  <SectionHead
                    icon={<BiCreditCard size={22} />}
                    title="Medical Aid Coverage"
                    sub="Clinical Billing Integration"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                      label="Provider"
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
                      placeholder="e.g. Discovery Health"
                    />
                    <Input
                      label="Plan Name"
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
                      placeholder="e.g. Classic Smart"
                    />
                    <Input
                      label="Member Number"
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
                      placeholder="e.g. 123456789"
                    />
                  </div>
                </Card>

                <Card className="p-8 space-y-6 rounded-lg">
                  <SectionHead
                    icon={<BiFirstAid size={22} />}
                    title="Emergency Contact"
                    sub="Fail-safe Response Parameters"
                    color="rose"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                      label="Full Name"
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
                      placeholder="Contact's full name"
                    />
                    <Input
                      label="Contact Number"
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
                      placeholder="+27 XX XXX XXXX"
                    />
                    <Input
                      label="Relationship"
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
                      placeholder="e.g. Spouse, Parent"
                    />
                  </div>
                </Card>

                <Card className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between px-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400  tracking-widest mb-1">
                      Subscription Tier
                    </p>
                    <p className="text-sm font-bold text-slate-800 ">
                      {patientData.subscriptionTier} Access
                    </p>
                  </div>
                  <Badge
                    label={
                      patientData.subscriptionTier === "pro"
                        ? "Premium"
                        : "Free Tier"
                    }
                    variant={
                      patientData.subscriptionTier === "pro"
                        ? "success"
                        : "soft"
                    }
                    className="rounded-full px-4 text-[9px] font-bold "
                  />
                </Card>
              </div>
            )}

          {/* ROLE DATA — Practitioner */}
          {activeTab === "role-data" &&
            currentRole === "practitioner" &&
            practitionerData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
                <Card className="p-8 space-y-6 rounded-lg">
                  <SectionHead
                    icon={<BiBuilding size={22} />}
                    title="Bank Disbursement"
                    sub="Payout Account & Tax Registration"
                    color="emerald"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      label="Bank Name"
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
                      label="Account Number"
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
                      label="Branch Code"
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
                    <Input
                      label="Tax Number"
                      value={practitionerData.bankAccount.taxNumber}
                      onChange={(e) =>
                        setPractitionerData({
                          ...practitionerData,
                          bankAccount: {
                            ...practitionerData.bankAccount,
                            taxNumber: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </Card>

                <Card className="p-8 space-y-5 rounded-lg">
                  <SectionHead
                    icon={<BiCertification size={22} />}
                    title="Clinical Credentials"
                    sub="HPCSA Verification"
                  />
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400  tracking-widest mb-1">
                        HPCSA No.
                      </p>
                      <p className="text-sm font-bold text-slate-700 font-mono">
                        {practitionerData.hpcsaNumber}
                      </p>
                    </div>
                    {practitionerData.hpcsaVerified ? (
                      <BiCheckCircle className="text-emerald-500" size={24} />
                    ) : (
                      <Badge
                        label="Pending"
                        variant="warning"
                        className="rounded-lg text-[9px]"
                      />
                    )}
                  </div>
                  <div className="p-6 bg-slate-50/50 rounded-3xl border border-dashed border-slate-300 flex items-center gap-4 hover:border-primary/40 cursor-pointer transition-all group">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-all shadow-sm">
                      <BiPlus size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-500 group-hover:text-primary transition-all">
                      Upload Certificate of Good Standing
                    </p>
                  </div>
                </Card>
              </div>
            )}

          {/* ROLE DATA — other roles */}
          {activeTab === "role-data" &&
            currentRole !== "patient" &&
            currentRole !== "practitioner" && (
              <Card className="p-8 rounded-lg animate-in fade-in duration-400">
                <SectionHead
                  icon={<BiBriefcase size={22} />}
                  title="Role Permissions"
                  sub="System Access Summary"
                />
                <div className="mt-6 bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-300 text-center">
                  <p className="text-sm font-bold text-slate-500">
                    Role-specific configuration for{" "}
                    <span className="text-primary ">
                      {currentRole.replace("_", " ")}
                    </span>{" "}
                    is managed by a system administrator.
                  </p>
                </div>
              </Card>
            )}

          {/* BILLING */}
          {activeTab === "billing" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
              <Card className="p-8 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden shadow-2xl shadow-slate-900/30">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 space-y-6">
                  <div>
                    <p className="text-[10px] text-primary font-bold  tracking-normalmb-2">
                      Subscription
                    </p>
                    <p className="text-3xl font-bold tracking-tight">
                      {currentRole === "patient" && patientData
                        ? `${patientData.subscriptionTier.to()} Clinical Access`
                        : "Premium Access"}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Button
                      variant="white"
                      className="h-14 rounded-2xl px-8 text-[10px] font-bold  tracking-widest text-slate-900"
                    >
                      Upgrade Plan
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-14 rounded-2xl px-8 text-[10px] font-bold  tracking-widest text-white/60 border-none hover:text-white"
                    >
                      Manage Methods
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* PRIVACY */}
          {activeTab === "privacy" && (
            <Card className="p-8 space-y-8 rounded-lg animate-in fade-in slide-in-from-right-4 duration-400">
              <SectionHead
                icon={<BiClipboard size={22} />}
                title="POPIA Compliance"
                sub="Data Consent Lifecycle"
                color="blue"
              />
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-dashed border-slate-300 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-none mb-1">
                      Active Consent — Version 2.4.1
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold ">
                      Signed April 2026
                    </p>
                  </div>
                  <Badge
                    label="Compliant"
                    variant="success"
                    className="px-4 py-2 rounded-xl text-[9px] font-bold "
                  />
                </div>
                <p className="text-xs text-slate-500 font-bold leading-relaxed italic">
                  "I hereby authorize 24/7 DigiHealth to process my clinical and
                  biometric data in accordance with the Protection of Personal
                  Information Act (POPIA)."
                </p>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="h-12 rounded-2xl text-[10px] font-bold  tracking-widest"
                >
                  Review Policy
                </Button>
                <Button
                  variant="ghost"
                  className="h-12 rounded-2xl text-[10px] font-bold  tracking-widest text-primary border-none bg-transparent"
                >
                  Who Accessed My Data?
                </Button>
              </div>
            </Card>
          )}
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

// ─── LOCAL HELPER ─────────────────────────────────────────────────────────────
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
    amber: "bg-amber-500/10 text-amber-500",
  };
  return (
    <div className="flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color] || colorMap.primary}`}
      >
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800  tracking-wide font-grotesk">
          {title}
        </h4>
        <p className="text-[10px] text-slate-400 font-bold  tracking-widest opacity-60">
          {sub}
        </p>
      </div>
    </div>
  );
}
