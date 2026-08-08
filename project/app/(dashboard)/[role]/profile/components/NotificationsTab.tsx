"use client";

import React from "react";
import {
  BiBell,
  BiEnvelope,
  BiMobileAlt,
  BiLoaderAlt,
  BiCheckCircle,
  BiDesktop,
} from "react-icons/bi";
import Button from "@/components/ui/Button";
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
    icon: <BiEnvelope size={20} />,
    color: "bg-sky-500/10 text-sky-600",
  },
  {
    key: "push",
    title: "Push notifications",
    description: "Real-time alerts in the app and browser",
    icon: <BiDesktop size={20} />,
    color: "bg-violet-500/10 text-violet-600",
  },
  {
    key: "sms",
    title: "SMS",
    description: "Critical reminders when you may be offline",
    icon: <BiMobileAlt size={20} />,
    color: "bg-emerald-500/10 text-emerald-600",
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
        icon={<BiBell size={22} />}
        title="Alert preferences"
        description="Choose how DigiHealth keeps you informed"
        color="amber"
      >
        <div className="space-y-3">
          {CHANNELS.map((ch) => {
            const on = notifications[ch.key];
            return (
              <button
                key={ch.key}
                type="button"
                onClick={() =>
                  setNotifications((prev) => ({
                    ...prev,
                    [ch.key]: !prev[ch.key],
                  }))
                }
                className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${
                  on
                    ? "border-primary/30 bg-primary/[0.04]  shadow-primary/5"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${ch.color}`}
                >
                  {ch.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{ch.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {ch.description}
                  </p>
                </div>
                <div
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                    on ? "bg-primary" : "bg-slate-200"
                  }`}
                  aria-hidden
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      on ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            You can change these anytime. Critical security alerts may still be
            sent by email.
          </p>
          <Button
            onClick={handleSaveNotifications}
            disabled={isSaving}
            className="!rounded-lg !h-11 !px-6 !max-w-none normal-case !tracking-normal shrink-0"
            icon={
              isSaving ? (
                <BiLoaderAlt className="animate-spin" size={18} />
              ) : (
                <BiCheckCircle size={18} />
              )
            }
            iconPosition="left"
          >
            {isSaving ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </ProfileSection>
    </div>
  );
}
