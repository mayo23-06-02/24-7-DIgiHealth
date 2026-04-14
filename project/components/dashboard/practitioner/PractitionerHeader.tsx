'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-icons/bi';

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

export default function PractitionerHeader({
  name,
  specialisation = '',
  upcomingCount = 0,
  riskAlertCount = 0,
  onMenuClick,
  onNotificationClick,
  avatarUrl,
}: PractitionerHeaderProps) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData>({ temp: 24, condition: 'Clear', icon: <BiSun className="text-amber-400" /> });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`).catch(() => null);
        if (!res?.ok) return;
        const data = await res.json();
        const code = data?.current_weather?.weathercode;
        const temp = Math.round(data?.current_weather?.temperature ?? 24);
        const map: Record<number, { label: string; icon: React.ReactNode }> = {
          0: { label: 'Clear', icon: <BiSun className="text-amber-400" /> },
          1: { label: 'Clear', icon: <BiSun className="text-amber-300" /> },
          2: { label: 'Cloudy', icon: <BiCloud className="text-slate-300" /> },
          3: { label: 'Overcast', icon: <BiCloud className="text-slate-400" /> },
          61: { label: 'Rainy', icon: <BiCloudRain className="text-sky-400" /> },
          80: { label: 'Showers', icon: <BiCloudRain className="text-blue-400" /> },
        };
        const info = map[code] || { label: 'Clear', icon: <BiSun className="text-amber-400" /> };
        setWeather({ temp, condition: info.label, icon: info.icon });
      } catch { /* silent */ }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => fetchWeather(p.coords.latitude, p.coords.longitude),
        () => fetchWeather(-26.2041, 28.0473),
      );
    }
  }, []);

  const formattedDate = useMemo(() =>
    time.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }), [time]);

  const formattedTime = useMemo(() =>
    time.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), [time]);

  const greetingHour = time.getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  const mockNotifications = [
    { id: 1, title: 'High Risk Alert', desc: 'Nomsa Dube — Critical risk score (95/100)', time: '2m ago', color: 'text-red-600 bg-red-50', urgent: true },
    { id: 2, title: 'Consultation Starting', desc: 'John Dlamini — Video call in 10 minutes', time: '8m ago', color: 'text-[#0052CC] bg-blue-50', urgent: false },
    { id: 3, title: 'Lab Result', desc: 'Amira Khan — Spirometry results available', time: '1h ago', color: 'text-purple-600 bg-purple-50', urgent: false },
  ];

  return (
    <header className="sticky top-0 z-[90] bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm px-6 py-3 flex items-center gap-4 shrink-0">
      {/* Mobile Menu Toggle */}
      <button
        onClick={onMenuClick}
        className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:text-[#0052CC] hover:bg-blue-50 transition-all lg:hidden shrink-0"
      >
        <BiMenuAltLeft size={22} />
      </button>

      {/* Date, Time & Weather */}
      <div className="hidden md:flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">{formattedDate}</span>
          <span className="text-[10px] font-black text-[#0052CC] font-mono">{formattedTime}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>{weather.icon}</span>
          <span>{weather.temp}°C · {weather.condition}</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-[2] max-w-md">
        <div className="bg-slate-100 rounded-full px-4 py-2 flex items-center gap-2.5 group focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-50 focus-within:border focus-within:border-[#0052CC]/20 transition-all">
          <BiSearch className="text-slate-400 group-focus-within:text-[#0052CC] shrink-0" size={16} />
          <input
            type="text"
            placeholder="Search patients, consultations…"
            className="bg-transparent outline-none border-none w-full text-sm text-slate-700 placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* Stats chips */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5">
          <BiCalendarEvent className="text-[#0052CC]" size={13} />
          <span className="text-xs font-bold text-[#0052CC]">{upcomingCount} Today</span>
        </div>
        {riskAlertCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-full px-3 py-1.5 animate-pulse">
            <BiPulse className="text-red-600" size={13} />
            <span className="text-xs font-bold text-red-600">{riskAlertCount} Alerts</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="relative shrink-0">
        <button
          onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all relative ${isNotifOpen ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30'}`}
        >
          <BiBell size={17} />
          {riskAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full text-[8px] text-white font-black flex items-center justify-center">
              {riskAlertCount}
            </span>
          )}
        </button>

        {isNotifOpen && (
          <div className="absolute top-12 right-0 w-80 bg-white border border-slate-100 rounded-3xl shadow-2xl shadow-slate-900/10 p-4 animate-in zoom-in-95 slide-in-from-top-2 duration-200 z-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-slate-800">Notifications</h4>
              <button className="text-[10px] font-bold text-[#0052CC] hover:underline">Mark all read</button>
            </div>
            <div className="space-y-2">
              {mockNotifications.map((n) => (
                <div key={n.id} className={`flex gap-3 p-2.5 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors ${n.urgent ? 'border border-red-100 bg-red-50/50' : ''}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${n.color}`}>
                    {n.urgent ? '⚠️' : '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-800">{n.title}</p>
                      <span className="text-[10px] text-slate-400 ml-2 shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{n.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative shrink-0">
        <button
          onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
          className="flex items-center gap-2 hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-supportive-teal flex items-center justify-center text-white text-xs font-black shadow-md overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              name.split(' ').filter(w => !w.startsWith('Dr')).map(w => w[0]).join('').slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="hidden lg:flex flex-col items-start">
            <span className="text-xs font-bold text-slate-800 leading-tight">{name}</span>
            <span className="text-[10px] text-primary font-medium">{specialisation || 'Practitioner'}</span>
          </div>
          <BiChevronDown size={14} className="text-slate-400 hidden lg:block" />
        </button>

        {isProfileOpen && (
          <div className="absolute top-12 right-0 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 animate-in zoom-in-95 duration-200 z-50">
            {['My Profile', 'Availability', 'Settings', 'Sign Out'].map((item) => (
              <button
                key={item}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${item === 'Sign Out' ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
