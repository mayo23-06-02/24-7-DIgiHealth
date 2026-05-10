"use client";
import React, { useState, useEffect } from "react";
import { patientApi } from "@/app/services/patientApi";
import { FiMapPin, FiRefreshCw, FiNavigation } from "react-icons/fi";
import Button from "../ui/Button";
import { useLowBandwidth } from "@/app/hooks/useLowBandwidth";

export default function NearestFacilityWidget({
  isOnline,
  offlineFacilitiesFallback,
}: {
  isOnline: boolean;
  offlineFacilitiesFallback?: any;
}) {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isLowBandwidth = useLowBandwidth();

  const fetchFacilities = async () => {
    if (!isOnline) {
      if (offlineFacilitiesFallback) {
        setFacilities(offlineFacilitiesFallback);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      // Stub location to somewhere in Johannesburg
      const res = await patientApi.getNearbyFacilities(-26.2041, 28.0473);
      setFacilities(res);
      setLastUpdated(new Date());
      // Save for offline
      localStorage.setItem("cached_facilities", JSON.stringify(res));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
    // Realtime polling if online
    if (isOnline) {
      const interval = setInterval(fetchFacilities, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  return (
    <div className="bg-white rounded-lg border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full overflow-hidden">
      {!isLowBandwidth && (
        <div className="w-full h-48 bg-slate-200 relative">
          <img
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074&auto=format&fit=crop"
            className="w-full h-full object-cover"
            alt="Map placeholder"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent to-white"></div>
        </div>
      )}

      <div
        className={`p-6 md:p-8 flex-1 flex flex-col ${isLowBandwidth ? "pt-8" : "pt-2"}`}
      >
        <div className="flex justify-between items-end mb-6 relative z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-grotesk">
              <FiMapPin className="text-trust-blue" /> Nearest ER & Clinics
            </h3>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                : "Finding locations..."}
            </p>
          </div>
          <Button
            variant="ghost"
            disabled={!isOnline || loading}
            onClick={fetchFacilities}
            className="w-10 h-10 p-0 rounded-full bg-slate-50 flex items-center justify-center text-primary hover:bg-slate-100 transition-colors disabled:opacity-50 !min-w-0 border-none"
            aria-label="Refresh locations"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>

        {loading && (
          <div className="py-10 text-center text-slate-500 font-bold animate-pulse">
            Scanning area...
          </div>
        )}

        {!loading && (
          <div className="space-y-4 flex-1">
            {facilities.map((fac) => (
              <div
                key={fac.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-trust-blue/50 hover: transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-trust-blue transition-colors font-grotesk">
                      {fac.name}
                    </h4>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                        {fac.type}
                      </span>
                      {fac.isER && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-high-vis-red">
                          ER
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${fac.name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-trust-blue/10 group-hover:text-trust-blue transition-colors shrink-0"
                  >
                    <FiNavigation />
                  </a>
                </div>

                <div className="flex justify-between items-end mt-4">
                  <div className="font-medium text-slate-500 text-sm">
                    {fac.distance} km away
                  </div>
                  <div className="text-right">
                    <span className="block text-sm  font-bold tracking-normal text-slate-500 mb-0.5">
                      Live Wait Time
                    </span>
                    <span
                      className={`text-xl font-bold ${fac.waitTime > 60 ? "text-orange-500" : "text-supportive-teal"}`}
                    >
                      {fac.waitTime} min
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
