"use client";

import React from "react";
import { Bell, Mail, Smartphone, CheckCircle2, Monitor } from "lucide-react";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import ProfileSection from "./ProfileSection";

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

const CHANNELS: {
  key: keyof NotifPrefs;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    key: "email",
    title: "Email",
    description: "Appointments, prescriptions, and account notices",
    icon: <Mail size={20} />,
    color: "bg-primary-50 text-primary",
  },
  {
    key: "push",
    title: "Push notifications",
    description: "Real-time alerts in browser",
    icon: <Monitor size={20} />,
    color: "bg-primary-50 text-primary",
  },

];

export default function NotificationsTab({
  notifications,
  setNotifications,
  isSaving,
  handleSaveNotifications,
}: NotificationsTabProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <ProfileSection
        icon={<Bell size={22} />}
        title="Alert preferences"
        description="Choose how DigiHealth keeps you informed"
        color="amber"
      >
        <div className="space-y-3">
          {CHANNELS.map((ch) => {
            const on = notifications[ch.key];
            return (
              <div
                key={ch.key}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                  on
                    ? "border-primary/30 bg-primary/[0.04]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${ch.color}`}
                >
                  {ch.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink-900">{ch.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {ch.description}
                  </p>
                </div>
                <Switch
                  checked={on}
                  onChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, [ch.key]: checked }))
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            You can change these anytime. Critical security alerts may still be
            sent by email.
          </p>
          <Button
            onClick={handleSaveNotifications}
            loading={isSaving}
     
            className="shrink-0"
          >
            {isSaving ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </ProfileSection>
    </div>
  );
}
