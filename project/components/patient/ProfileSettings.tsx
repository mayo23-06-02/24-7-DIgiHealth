"use client";
import React, { useState } from "react";
import { maskSAID, maskMobile, maskEmail } from "../../utils/maskPHI";
import { FiShield, FiLock, FiLogOut, FiCheck } from "react-icons/fi";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface ProfileSettingsProps {
  user: any;
  onClose: () => void;
}

export default function ProfileSettings({
  user,
  onClose,
}: ProfileSettingsProps) {
  const [mfaEnabled, setMfaEnabled] = useState(true);

  if (!user) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Profile & Settings"
      width="2xl"
    >
      <div className="space-y-8">
        {/* Identity */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-normal mb-4">
            Identity Details
          </h3>
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium text-sm">
                Full Name
              </span>
              <span className="font-bold text-slate-800">
                {user.name || "Patient"}
              </span>
            </div>
            <div className="h-px bg-slate-200 w-full opacity-50" />
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium text-sm">
                SA ID Number
              </span>
              <span className="font-bold text-slate-800 tabular-nums">
                {maskSAID(user.id)}
              </span>
            </div>
            <div className="h-px bg-slate-200 w-full opacity-50" />
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium text-sm">Mobile</span>
              <span className="font-bold text-slate-800 tabular-nums">
                {maskMobile(user.mobile)}
              </span>
            </div>
            <div className="h-px bg-slate-200 w-full opacity-50" />
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium text-sm">Email</span>
              <span className="font-bold text-slate-800">
                {maskEmail(user.email)}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="mt-3 text-primary font-bold hover:underline text-xs p-0 !min-w-0 border-none bg-transparent"
          >
            Request Identity Update
          </Button>
        </div>

        {/* Security */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-normal mb-4">
            Security & Privacy
          </h3>
          <div className="space-y-3">
            <Button
              variant="white"
              fullWidth
              className="flex justify-between items-center p-5 pl-4 rounded-2xl border border-slate-200 hover:border-primary/20 hover:shadow-none transition-all group bg-white h-auto"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <FiLock />
                </div>
                <span className="font-bold text-slate-800 uppercase tracking-normal text-[10px]">
                  Change Password
                </span>
              </div>
              <span className="text-slate-400 font-bold group-hover:text-primary transition-colors">
                →
              </span>
            </Button>

            <div className="w-full flex justify-between items-center p-5 pl-4 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <FiShield />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block uppercase tracking-normal text-[10px]">
                    Two-Factor Auth (MFA)
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-normal">
                    Protect your clinical data
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={`w-14 h-8 rounded-full transition-colors flex items-center px-1 ${mfaEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-none transform transition-transform ${mfaEnabled ? "translate-x-6" : "translate-x-0"}`}
                ></div>
              </button>
            </div>
          </div>
        </div>

        {/* POPIA */}
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
          <h4 className="font-bold text-emerald-600 flex items-center gap-2 mb-2 uppercase tracking-wide text-xs">
            <FiCheck /> POPIA Compliant
          </h4>
          <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4 italic opacity-80">
            "Your medical data is encrypted and secure. Consent provided on 14
            Jan 2026 (v2.1)."
          </p>
          <Button
            variant="ghost"
            className="text-[10px] font-bold text-emerald-600 underline p-0 !min-w-0 border-none bg-transparent h-auto"
          >
            View Data Access Audit Log
          </Button>
        </div>

        <Button
          variant="ghost"
          fullWidth
          className="flex justify-center items-center gap-2 p-4 rounded-xl text-rose-500 font-bold hover:bg-rose-50 transition-colors border-none bg-transparent h-auto text-xs uppercase tracking-normal"
        >
          <FiLogOut /> Sign Out Securely
        </Button>
      </div>
    </Modal>
  );
}
