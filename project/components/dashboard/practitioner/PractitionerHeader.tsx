"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BiBell,
  BiSearch,
  BiMenuAltLeft,
  BiPulse,
  BiCalendarEvent,
  BiSun,
  BiCloud,
  BiCloudRain,
  BiChevronDown,
} from "react-icons/bi";

interface PractitionerHeaderProps {
  name: string;
  specialisation?: string;
  upcomingCount?: number;
  riskAlertCount?: number;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  avatarUrl?: string;
}

interface WeatherData {
  temp: number;
  condition: string;
  icon: React.ReactNode;
}

import Button from "@/components/ui/Button";

export default function PractitionerHeader({
  name,
  specialisation = "",
  upcomingCount = 0,
  riskAlertCount = 0,
  onMenuClick,
  onNotificationClick,
  avatarUrl,
}: PractitionerHeaderProps) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData>({
    temp: 24,
    condition: "Clear",
    icon: <BiSun className="text-amber-400" />,
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
        ).catch(() => null);
        if (!res?.ok) return;
        const data = await res.json();
        const code = data?.current_weather?.weathercode;
        const temp = Math.round(data?.current_weather?.temperature ?? 24);
        const map: Record<number, { label: string; icon: React.ReactNode }> = {
          0: { label: "Clear", icon: <BiSun className="text-amber-400" /> },
          1: { label: "Clear", icon: <BiSun className="text-amber-300" /> },
          2: { label: "Cloudy", icon: <BiCloud className="text-slate-300" /> },
          3: {
            label: "Overcast",
            icon: <BiCloud className="text-slate-400" />,
          },
          61: {
            label: "Rainy",
            icon: <BiCloudRain className="text-sky-400" />,
          },
          80: {
            label: "Showers",
            icon: <BiCloudRain className="text-blue-400" />,
          },
        };
        const info = map[code] || {
          label: "Clear",
          icon: <BiSun className="text-amber-400" />,
        };
        setWeather({ temp, condition: info.label, icon: info.icon });
      } catch {
        /* silent */
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => fetchWeather(p.coords.latitude, p.coords.longitude),
        () => fetchWeather(-26.2041, 28.0473),
      );
    }
  }, []);

  const formattedDate = useMemo(
    () =>
      time.toLocaleDateString("en-ZA", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    [time],
  );

  const formattedTime = useMemo(
    () =>
      time.toLocaleTimeString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [time],
  );

  const greetingHour = time.getHours();
  const greeting =
    greetingHour < 12
      ? "Good morning"
      : greetingHour < 17
        ? "Good afternoon"
        : "Good evening";

  const mockNotifications = [
    {
      id: 1,
      title: "High Risk Alert",
      desc: "Nomsa Dube — Critical risk score (95/100)",
      time: "2m ago",
      color: "text-red-600 bg-red-50",
      urgent: true,
    },
    {
      id: 2,
      title: "Consultation Starting",
      desc: "John Dlamini — Video call in 10 minutes",
      time: "8m ago",
      color: "text-primary bg-blue-50",
      urgent: false,
    },
  ];

  return (
    <header className="sticky top-0 z-[90] bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-none px-6 py-4 flex items-center gap-6 shrink-0">
      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        onClick={onMenuClick}
        className="w-10 h-10 p-0 rounded-2xl bg-slate-50 hover:bg-primary/5 text-slate-500 hover:text-primary transition-all lg:hidden shrink-0 border-none !min-w-0"
      >
        <BiMenuAltLeft size={22} />
      </Button>

      {/* Date, Time & Weather */}
      <div className="hidden lg:flex items-center gap-4 min-w-0 pr-4 border-r border-slate-100/50">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400  tracking-normal leading-none mb-1">
            System Clock
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800  tracking-tight">
              {formattedDate}
            </span>
            <span className="text-xs font-bold text-primary tabular-nums">
              {formattedTime}
            </span>
          </div>
        </div>
        <div className="flex flex-col border-l border-slate-100 pl-4">
          <span className="text-[10px] font-bold text-slate-400  tracking-normal leading-none mb-1">
            Local Weather
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span className="text-sm">{weather.icon}</span>
            <span className="tabular-nums">
              {weather.temp}°C · {weather.condition}
            </span>
          </div>
        </div>
      </div>

      {/* Search - Growing to fill space */}
      <div className="flex-1 max-w-lg hidden md:block">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-2.5 flex items-center gap-3 group focus-within:bg-white focus-within:shadow-none focus-within:shadow-primary/5 focus-within:border-primary/20 transition-all duration-300">
          <BiSearch
            className="text-slate-400 group-focus-within:text-primary shrink-0 transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search clinical registry…"
            className="bg-transparent outline-none border-none w-full text-xs font-bold text-slate-700 placeholder:text-slate-300  tracking-tight"
          />
        </div>
      </div>

      {/* Actions & Alerts */}
      <div className="flex items-center gap-3 ml-auto shrink-0">
        {/* Live Stats */}
        <div className="hidden xl:flex items-center gap-2 pr-4 mr-4 border-r border-slate-100">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100 shadow-none animate-in fade-in duration-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold  tracking-normal leading-none">
              {upcomingCount} SESSIONS
            </span>
          </div>
          {riskAlertCount > 0 && (
            <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-2xl border border-rose-100 shadow-none">
              <BiPulse size={14} className="animate-pulse" />
              <span className="text-[10px] font-bold  tracking-normal leading-none">
                {riskAlertCount} ALERTS
              </span>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsProfileOpen(false);
            }}
            className={`w-11 h-11 p-0 rounded-2xl flex items-center justify-center transition-all relative border-none !min-w-0 ${isNotifOpen ? "bg-primary text-white shadow-none shadow-primary/30" : "bg-slate-50 text-slate-400 hover:bg-primary/5 hover:text-primary"}`}
          >
            <BiBell size={20} />
            {riskAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 border-2 border-white rounded-full text-[9px] text-white font-bold flex items-center justify-center shadow-md">
                {riskAlertCount}
              </span>
            )}
          </Button>

          {isNotifOpen && (
            <div className="absolute top-14 right-0 w-85 bg-white border border-slate-100 rounded-[2rem] shadow-none shadow-slate-900/10 p-5 animate-in zoom-in-95 slide-in-from-top-4 duration-300 z-[100]">
              <div className="flex items-center justify-between mb-5 px-1">
                <h4 className="text-[11px] font-bold text-slate-800  tracking-normal font-grotesk">
                  Clinical Inbox
                </h4>
                <Button
                  variant="ghost"
                  className="text-[10px] font-bold text-primary hover:bg-primary/5 border-none h-auto p-0 !min-w-0  tracking-normal"
                >
                  Clear All
                </Button>
              </div>
              <div className="space-y-3">
                {mockNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 ${n.urgent ? "bg-rose-50/50 border border-rose-100 hover:bg-rose-50" : "bg-slate-50/50 border border-transparent hover:bg-slate-50 hover:border-slate-100"}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm shadow-none ${n.color}`}
                    >
                      {n.urgent ? "⚠️" : "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[11px] font-bold text-slate-800  tracking-tight">
                          {n.title}
                        </p>
                        <span className="text-[9px] font-bold text-slate-400  tracking-normal tabular-nums">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 leading-relaxed italic opacity-80">
                        {n.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <Button
            variant="ghost"
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-3 bg-slate-50 hover:bg-primary/5 p-1.5 pr-4 rounded-2xl transition-all duration-300 border-none h-auto !min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shadow-none shadow-primary/20 overflow-hidden shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                name
                  .split(" ")
                  .filter((w) => !w.startsWith("Dr"))
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .to()
              )}
            </div>
            <div className="hidden lg:flex flex-col items-start min-w-0">
              <span className="text-[11px] font-bold text-slate-800 leading-none  tracking-tight truncate w-32 text-left">
                {name}
              </span>
              <span className="text-[9px] text-primary font-bold  tracking-normal mt-1.5">
                {specialisation || "Licensed Provider"}
              </span>
            </div>
            <BiChevronDown
              size={14}
              className={`text-slate-400 hidden lg:block transition-transform duration-300 ${isProfileOpen ? "rotate-180" : ""}`}
            />
          </Button>

          {isProfileOpen && (
            <div className="absolute top-14 right-0 w-56 bg-white border border-slate-100 rounded-[1.5rem] shadow-none p-2 animate-in zoom-in-95 duration-300 z-[100]">
              <div className="px-4 py-3 mb-2 border-b border-slate-50">
                <p className="text-[9px] font-bold text-slate-400  tracking-normal mb-1">
                  Signed in as
                </p>
                <p className="text-[11px] font-bold text-slate-800 truncate">
                  {name}
                </p>
              </div>
              {["My Profile", "Availability", "Clinical Settings"].map(
                (item) => (
                  <button
                    key={item}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold  tracking-normal text-slate-600 hover:bg-slate-50 hover:text-primary transition-all"
                  >
                    {item}
                  </button>
                ),
              )}
              <div className="h-px bg-slate-50 my-2" />
              <button className="w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold  tracking-normal text-rose-500 hover:bg-rose-50 transition-all flex items-center gap-2">
                Sign Out Clinical Portal
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
