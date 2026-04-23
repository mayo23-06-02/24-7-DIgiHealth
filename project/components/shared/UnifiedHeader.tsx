"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BiSearch,
  BiBell,
  BiBookmark,
  BiCloudRain,
  BiSun,
  BiCloud,
  BiCloudLightning,
  BiCloudSnow,
  BiMenuAltLeft,
  BiCapsule,
  BiPulse,
  BiCalendar,
} from "react-icons/bi";
import { useAuthContext } from "../auth/AuthProvider";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";

interface WeatherData {
  temp: number;
  condition: string;
  location: string;
  icon: React.ReactNode;
}

interface UnifiedHeaderProps {
  onNotificationClick?: () => void;
  onMenuClick?: () => void;
}

const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  onNotificationClick,
  onMenuClick,
}) => {
  const { user } = useAuthContext();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [time, setTime] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherData>({
    temp: 24,
    condition: "Loading...",
    location: "Detecting location...",
    icon: <BiSun className="text-amber-400 text-xl animate-pulse" />,
  });

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
        ).catch(() => null);

        if (!res || !res.ok) throw new Error("Weather API unreachable");
        const data = await res.json();
        const current = data?.current_weather;
        if (!current) throw new Error("No weather data");

        const mapping: Record<number, { label: string; icon: any }> = {
          0: { label: "Clear", icon: <BiSun className="text-amber-400" /> },
          1: {
            label: "Mainly Clear",
            icon: <BiSun className="text-amber-300" />,
          },
          2: {
            label: "Partly Cloudy",
            icon: <BiCloud className="text-slate-400" />,
          },
          3: {
            label: "Overcast",
            icon: <BiCloud className="text-slate-500" />,
          },
          45: { label: "Foggy", icon: <BiCloud className="text-slate-300" /> },
          51: {
            label: "Drizzle",
            icon: <BiCloudRain className="text-sky-400" />,
          },
          61: {
            label: "Rainy",
            icon: <BiCloudRain className="text-blue-500" />,
          },
          80: {
            label: "Showers",
            icon: <BiCloudRain className="text-blue-400" />,
          },
          95: {
            label: "Stormy",
            icon: <BiCloudLightning className="text-amber-600" />,
          },
          71: {
            label: "Snowy",
            icon: <BiCloudSnow className="text-sky-100" />,
          },
        };

        const { label, icon } = mapping[current.weathercode] || {
          label: "Cloudy",
          icon: <BiCloud className="text-slate-400" />,
        };

        setWeather({
          temp: Math.round(current.temperature),
          condition: label,
          location: `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`,
          icon,
        });
      } catch {
        setWeather({
          temp: 24,
          condition: "Offline",
          location: "Location unverified",
          icon: <BiSun className="text-amber-400" />,
        });
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(-26.2041, 28.0473),
      );
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.isRead).length);
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ readAll: true }),
      headers: { "Content-Type": "application/json" },
    });
    fetchNotifications();
  };

  const formattedDate = useMemo(
    () =>
      time
        ? time.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null,
    [time],
  );

  const formattedTime = useMemo(
    () =>
      time
        ? time.toLocaleTimeString("en-ZA", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : null,
    [time],
  );

  return (
    <header className="h-24 px-4 lg:px-10 flex items-center justify-between border-b border-slate-100 bg-white/70 backdrop-blur-xl sticky top-0 z-30 transition-all duration-500">
      <div className="flex items-center gap-4 lg:hidden mr-4">
        <button
          onClick={onMenuClick}
          className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
        >
          <BiMenuAltLeft size={24} />
        </button>
      </div>

      <div className="hidden sm:flex flex-1 flex-col gap-1 pr-4 lg:pr-10">
        <div className="flex items-center gap-2">
          <span className="text-xs  text-slate-400 ">{formattedDate}</span>
          <span className="w-1 h-1 bg-slate-200 rounded-full" />
          <span className="text-xs font-bold text-primary ">
            {formattedTime}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-800">
          <span className="text-sm">{weather.icon}</span>
          <span className="text-xs font-bold">
            {weather.temp}°C {weather.condition}
          </span>
        </div>
      </div>

      <div className="flex-2 max-w-[600px] px-2 lg:px-10 hidden md:block">
        <div className="bg-slate-100/50 border border-slate-100 rounded-full px-6 py-1 flex items-center gap-4 group focus-within:bg-white focus-within:border-primary/30 focus-within:shadow-none focus-within:shadow-primary/5 transition-all duration-500">
          <BiSearch className="text-slate-400 text-xl group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search doctors, clinical labs, or patient records..."
            className="bg-transparent border-none outline-none w-[350px] text-sm text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-end gap-3 lg:gap-6">
        <div className="relative">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className={`w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center cursor-pointer transition-all relative ${
              isNotificationOpen
                ? "bg-primary text-white shadow-none shadow-primary/20"
                : "bg-white text-slate-400 hover:text-primary hover:bg-primary/5"
            }`}
          >
            <BiBell size={20} />
            {unreadCount > 0 && (
              <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute top-[56px] right-0 w-[350px] bg-white border border-slate-200 rounded-lg shadow-none shadow-primary/10 p-6 animate-in zoom-in-95 slide-in-from-top-4 duration-300 z-50">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-slate-800  font-grotesk">
                  Activity Center
                </h4>
                <button
                  onClick={markAllRead}
                  className="text-sm text-primary  hover:underline"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                {notifications.length === 0 ? (
                  <p className="text-center text-slate-400 py-10 text-xs">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.map((notif, i) => (
                    <div
                      key={notif._id || i}
                      className={`flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group ${!notif.isRead ? "bg-primary/[0.03]" : ""}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.isRead ? "bg-slate-50 text-slate-400" : "bg-primary/10 text-primary"}`}
                      >
                        {notif.type === "new_appointment" ? (
                          <BiCalendar />
                        ) : (
                          <BiBell />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <p
                            className={`text-xs font-bold truncate ${notif.isRead ? "text-slate-500" : "text-slate-800"}`}
                          >
                            {notif.title}
                          </p>
                          <span className="text-[9px] text-slate-400 font-bold ml-2">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {notif.body}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setIsNotificationOpen(false);
                  onNotificationClick?.();
                }}
              >
                Close
              </Button>
            </div>
          )}
        </div>

        <button className="hidden sm:flex w-10 h-10 bg-white rounded-xl border border-slate-100 items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-all">
          <BiBookmark size={20} />
        </button>

        <Link
          href={`/${user?.role}/profile`}
          className="group flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-4 lg:pr-6 rounded-full transition-all ml-2"
        >
          <Avatar
            name={user?.name || "User"}
            src={user?.avatarUrl}
            size="sm"
            className="group-hover:scale-105"
          />
          <div className="hidden lg:flex flex-col">
            <span className="text-xs    font-bold text-slate-800 truncate leading-none mb-1">
              {user?.name || "User"}
            </span>
            <span className="text-[9px] font-bold text-primary   leading-none">
              {user?.role?.replace("_", " ") || "Member"}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default UnifiedHeader;
