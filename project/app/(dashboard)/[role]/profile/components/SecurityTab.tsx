"use client";

import React from "react";
import { BiLockAlt, BiDevices, BiTrash } from "react-icons/bi";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface Device {
  id: string;
  name: string;
  lastUsed: string;
  active: boolean;
}

interface SecurityTabProps {
  passwordState: any;
  setPasswordState: React.Dispatch<React.SetStateAction<any>>;
  isSaving: boolean;
  handleSavePassword: () => void;
  devices: Device[];
  handleRevokeDevice: (id: string) => void;
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

export default function SecurityTab({
  passwordState,
  setPasswordState,
  isSaving,
  handleSavePassword,
  devices,
  handleRevokeDevice,
}: SecurityTabProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
      <Card className="p-8 space-y-8 rounded-lg border-slate-100 shadow-slate-900/5">
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
              setPasswordState((prev: any) => ({
                ...prev,
                currentPassword: e.target.value,
              }))
            }
          />
          <Input
            label="Target Password"
            type="password"
            className="bg-slate-50/50"
            value={passwordState.newPassword}
            onChange={(e) =>
              setPasswordState((prev: any) => ({
                ...prev,
                newPassword: e.target.value,
              }))
            }
          />
          <Input
            label="Confirm Target"
            type="password"
            className="bg-slate-50/50"
            value={passwordState.confirmPassword}
            onChange={(e) =>
              setPasswordState((prev: any) => ({
                ...prev,
                confirmPassword: e.target.value,
              }))
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

      <Card className="p-8 space-y-8 rounded-lg border-slate-100 shadow-slate-900/5">
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
              className="group p-6 bg-slate-50/50 rounded-lg border border-slate-100 flex items-center justify-between hover:bg-white transition-all duration-500"
            >
              <div className="flex items-center gap-5">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    device.active
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <BiDevices size={24} />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-800">
                    {device.name}
                  </h1>
                  <p className="text-sm font-bold text-slate-500">
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
  );
}
