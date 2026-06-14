"use client";

import React from "react";
import { BiCheckCircle } from "react-icons/bi";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ProfileSidebarProps {
  setToast: (toast: { message: string; type: "success" | "error" | "info" } | null) => void;
}

export default function ProfileSidebar({ setToast }: ProfileSidebarProps) {
  const stats = [
    { label: "Identity", val: 100, color: "bg-emerald-500" },
    { label: "Clinical", val: 85, color: "bg-primary" },
    { label: "Security", val: 70, color: "bg-amber-500" },
  ];

  return (
    <div className="xl:col-span-4 space-y-6">
      <Card className="p-8 rounded-lg bg-white border-slate-100 shadow-slate-900/5 sticky top-8">
        <h1 className="text-xs font-bold text-slate-500 uppercase mb-6">
          Profile Health
        </h1>
        <div className="space-y-6">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
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
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-primary">
              <BiCheckCircle size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-500 mb-0.5">
                Integrity Score
              </h1>
              <h1 className="text-sm font-bold text-slate-800">
                High Reliability
              </h1>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-8 rounded-lg bg-linear-to-br from-primary/70 to-gray-400 text-white shadow-primary/20">
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
          className="h-14 rounded-2xl text-sm font-bold text-primary"
          onClick={() => setToast({ message: "Assistance request sent to support.", type: "success" })}
        >
          Open Support Ticket
        </Button>
      </Card>
    </div>
  );
}
