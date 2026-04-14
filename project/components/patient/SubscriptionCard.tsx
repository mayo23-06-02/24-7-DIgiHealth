"use client";
import React, { useState } from 'react';
import { FiCreditCard, FiCheckCircle } from 'react-icons/fi';
import { patientApi } from '../../services/patientApi';

export default function SubscriptionCard({ subscription }: { subscription: any }) {
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    try {
      const { url } = await patientApi.managePayment();
      // In real scenario, redirect user or open embedded iframe
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) return null;

  return (
    <div className="bg-trust-blue text-white rounded-[2rem] p-8 relative overflow-hidden shadow-[0_15px_40px_rgba(0,82,204,0.3)]">
      {/* Decorative BG */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
           <h3 className="text-xl font-bold mb-1 opacity-90">Digital Care Plan</h3>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-green-400 border-2 border-trust-blue"></div>
             <span className="font-bold tracking-widest uppercase text-sm">{subscription.status}</span>
           </div>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-full flex justify-center items-center backdrop-blur-md">
           <FiCheckCircle className="text-2xl" />
        </div>
      </div>

      <div className="space-y-1 mb-8 relative z-10">
         <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Next Billing Date</p>
         <p className="text-2xl font-bold">{new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
         <p className="text-white/80 font-medium">ZAR {subscription.amount}.00 / month</p>
      </div>

      <button 
        onClick={handleManage}
        disabled={loading}
        className="w-full py-4 bg-white text-trust-blue font-bold rounded-full flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors shadow-lg disabled:opacity-80"
      >
        <FiCreditCard />
        {loading ? "Authenticating..." : "Manage Payment Method"}
      </button>
    </div>
  );
}
