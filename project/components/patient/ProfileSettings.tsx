"use client";
import React, { useState } from 'react';
import { maskSAID, maskMobile, maskEmail } from '../../utils/maskPHI';
import { FiShield, FiLock, FiLogOut, FiX, FiCheck } from 'react-icons/fi';

interface ProfileSettingsProps {
  user: any;
  onClose: () => void;
}

export default function ProfileSettings({ user, onClose }: ProfileSettingsProps) {
  const [mfaEnabled, setMfaEnabled] = useState(true);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[110] flex lg:items-center justify-end lg:justify-center bg-slate-900/50 backdrop-blur-sm p-0 md:p-6">
      <div className="bg-white w-full lg:w-[600px] h-full lg:h-auto lg:max-h-[90vh] lg:rounded-3xl shadow-2xl overflow-y-auto animate-slide-left lg:animate-none">
        
        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 p-6 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-slate-800">Profile & Settings</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <FiX className="text-xl text-slate-600" />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          
          {/* Identity */}
          <div>
            <h3 className="text-sm font-bold text-trust-blue uppercase tracking-widest mb-4">Identity Details</h3>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Full Name</span>
                <span className="font-bold text-slate-800">{user.name || "Patient"}</span>
              </div>
              <div className="h-px bg-slate-200 w-full" />
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">SA ID Number</span>
                <span className="font-bold text-slate-800">{maskSAID(user.id)}</span>
              </div>
              <div className="h-px bg-slate-200 w-full" />
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Mobile</span>
                <span className="font-bold text-slate-800">{maskMobile(user.mobile)}</span>
              </div>
              <div className="h-px bg-slate-200 w-full" />
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Email</span>
                <span className="font-bold text-slate-800">{maskEmail(user.email)}</span>
              </div>
            </div>
            <button className="mt-3 text-trust-blue font-semibold hover:underline text-sm ml-2">Request Identity Update</button>
          </div>

          {/* Security */}
          <div>
            <h3 className="text-sm font-bold text-trust-blue uppercase tracking-widest mb-4">Security Privacy</h3>
            <div className="space-y-3">
              <button className="w-full flex justify-between items-center p-5 rounded-2xl border border-slate-200 hover:border-trust-blue hover:shadow-sm transition-all group bg-white">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-trust-blue/10 group-hover:text-trust-blue transition-colors">
                     <FiLock />
                   </div>
                   <span className="font-bold text-slate-800">Change Password</span>
                </div>
                <span className="text-slate-400 font-semibold group-hover:text-trust-blue transition-colors">→</span>
              </button>

              <div className="w-full flex justify-between items-center p-5 rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                     <FiShield />
                   </div>
                   <div>
                     <span className="font-bold text-slate-800 block">Two-Factor Auth (MFA)</span>
                     <span className="text-sm text-slate-500">Protect your account</span>
                   </div>
                </div>
                <button 
                  onClick={() => setMfaEnabled(!mfaEnabled)} 
                  className={`w-14 h-8 rounded-full transition-colors flex items-center px-1 ${mfaEnabled ? 'bg-supportive-teal' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform ${mfaEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* POPIA */}
          <div className="bg-supportive-teal/10 rounded-2xl p-6 border border-supportive-teal/20">
             <h4 className="font-bold text-supportive-teal flex items-center gap-2 mb-2"><FiCheck /> POPIA Compliant</h4>
             <p className="text-sm text-slate-600 leading-relaxed mb-4">Your medical data is encrypted and secure. Consent provided on 14 Jan 2026 (v2.1).</p>
             <button className="text-sm font-bold text-supportive-teal underline">View Data Access Audit Log</button>
          </div>

          <button className="w-full flex justify-center items-center gap-2 p-4 rounded-xl text-high-vis-red font-bold hover:bg-red-50 transition-colors">
             <FiLogOut /> Sign Out Securely
          </button>

        </div>
      </div>
    </div>
  );
}
