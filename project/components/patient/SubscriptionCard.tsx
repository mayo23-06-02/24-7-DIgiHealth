"use client";
import React, { useState } from "react";
import { FiCreditCard, FiCheckCircle } from "react-icons/fi";
import { patientApi } from "../../services/patientApi";
import Button from "../ui/Button";

export default function SubscriptionCard({
  subscription,
}: {
  subscription: any;
}) {
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    try {
      const { url } = await patientApi.managePayment();
      // In real scenario, redirect user or open embedded iframe
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) return null;

  return (
    <div className="bg-primary text-white rounded-[2rem] p-8 relative overflow-hidden shadow-[0_15px_40px_rgba(0,82,204,0.3)]">
      {/* Decorative BG */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>

      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <h3 className="text-xl font-bold mb-1 opacity-90  tracking-normal text-xs font-grotesk">
            Digital Care Plan
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-primary"></div>
            <span className="font-bold tracking-normal  text-[10px]">
              {subscription.status}
            </span>
          </div>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-full flex justify-center items-center backdrop-blur-md">
          <FiCheckCircle className="text-2xl" />
        </div>
      </div>

      <div className="space-y-1 mb-8 relative z-10">
        <p className="text-white/70 text-[10px] font-bold  tracking-normal">
          Next Billing Date
        </p>
        <p className="text-2xl font-bold">
          {new Date(subscription.nextBillingDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="text-white/80 font-bold  tracking-normal text-[10px]">
          ZAR {subscription.amount}.00 / month
        </p>
      </div>

      <Button
        variant="white"
        onClick={handleManage}
        disabled={loading}
        fullWidth
        className="py-4 text-primary font-bold rounded-full flex items-center justify-center gap-2 h-auto shadow-none"
      >
        <FiCreditCard />
        {loading ? "Authenticating..." : "Manage Payment Method"}
      </Button>
    </div>
  );
}
