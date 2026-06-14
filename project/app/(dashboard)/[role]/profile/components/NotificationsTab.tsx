"use client";

import React from "react";
import { BiBell, BiEnvelope, BiShieldQuarter, BiMobileAlt, BiLoaderAlt } from "react-icons/bi";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface NotifPrefs {
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface NotificationsTabProps {
  notifications: NotifPrefs;
  setNotifications: React.Dispatch<React.SetStateAction<NotifPrefs>>;
  isSaving: boolean;
  handleSaveNotifications: () => void;
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

export default function NotificationsTab({
  notifications,
  setNotifications,
  isSaving,
  handleSaveNotifications,
}: NotificationsTabProps) {
  const togglePrefs = [
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
      sub: "Quick updates such as schedule reminders",
      icon: BiMobileAlt,
    },
  ] as const;

  return (
    <Card className="p-8 space-y-8 border-slate-100 shadow-slate-900/5 animate-in slide-in-from-left-4 duration-500">
      <SectionHead
        icon={<BiBell size={24} />}
        title="Neural Alerts"
        sub="Synchronization channels for clinical events"
      />
      <div className="space-y-4">
        {togglePrefs.map((notif) => (
          <div
            key={notif.key}
            className="flex items-center justify-between p-8 bg-slate-50 rounded-lg border border-slate-100 group hover:bg-white transition-all duration-500"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center text-primary group-hover:text-primary transition-all border border-slate-50">
                <notif.icon size={26} />
              </div>
              <div>
                <h1 className="text-md font-bold text-slate-800">
                  {notif.label}
                </h1>
                <p className="text-sm text-slate-600">{notif.sub}</p>
              </div>
            </div>
            <button
              onClick={() =>
                setNotifications((prev) => ({
                  ...prev,
                  [notif.key]: !prev[notif.key],
                }))
              }
              className={`w-16 h-9 rounded-full transition-all relative shrink-0 ${
                notifications[notif.key] ? "bg-primary" : "bg-slate-200"
              }`}
            >
              <div
                className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${
                  notifications[notif.key] ? "left-8.5" : "left-1.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-8 pt-6 border-t border-slate-50">
        <Button
          onClick={handleSaveNotifications}
          disabled={isSaving}
          className="h-14 rounded-2xl px-10 text-sm font-bold bg-primary text-white"
        >
          {isSaving ? (
            <BiLoaderAlt className="animate-spin" size={20} />
          ) : (
            "Save Preferences"
          )}
        </Button>
      </div>
    </Card>
  );
}
