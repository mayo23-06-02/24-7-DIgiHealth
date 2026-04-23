import React, { useState, useEffect, useMemo } from "react";
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
  BiTrash,
  BiCalendarX,
  BiCalendarEdit,
  BiCheckCircle,
} from "react-icons/bi";
import Modal from "@/components/ui/Modal";

interface WeatherData {
  temp: number;
  condition: string;
  location: string;
  icon: React.ReactNode;
}

export default function DashboardHeader({
  name,
  onNotificationClick,
  onMenuClick,
}: {
  name: string;
  onNotificationClick?: () => void;
  onMenuClick?: () => void;
}) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData>({
    temp: 24,
    condition: "Loading...",
    location: "Detecting location...",
    icon: <BiSun className="text-amber-400 text-xl animate-pulse" />,
  });
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather Logic
  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
        ).catch(() => null);

        if (!res || !res.ok) {
          throw new Error("Weather API unreachable");
        }

        const data = await res.json();
        const current = data?.current_weather;

        if (!current) throw new Error("No weather data");

        // Map WMO Weather Codes to icons and strings
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
          // 71 was duplicated in original file - fixed below
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
      } catch (err) {
        // Silent fallback to avoid unhandled rejections crashing the UI
        console.warn("Weather sync failed, using mock fallback.");
        setWeather({
          temp: 24,
          condition: "Offline",
          location: "Location unverified",
          icon: <BiCloud className="text-slate-400" />,
        });
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(-26.2041, 28.0473), // Fallback: Johannesburg
      );
    }
  }, []);

  const formattedDate = useMemo(
    () =>
      time.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [time],
  );

  const formattedTime = useMemo(
    () =>
      time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    [time],
  );

  return (
    <>
      <header className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-[7px] flex items-center justify-between z-[90] border-b border-slate-100 transition-all duration-500">
        {/* Mobile Toggle & Branding */}
        <div className="flex items-center gap-4 lg:hidden mr-4">
          <button
            onClick={onMenuClick}
            className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
          >
            <BiMenuAltLeft size={24} />
          </button>
        </div>

        {/* Date & Weather (Hidden on small mobile) */}
        <div className="hidden sm:flex flex-1 flex flex-col gap-1 pr-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font- text-slate-400 ">
              {formattedDate}
            </span>
            <span className="w-1 h-1 bg-slate-200 rounded-lg" />
            <span className="text-xs font-bold text-primary">
              {formattedTime}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-800">
              <span className="text-xl">{weather.icon}</span>
              <span className="text-sm font-bold text-gray-800">
                {weather.temp}°C {weather.condition}
              </span>
            </div>
          </div>
        </div>

        {/* SEARCH BAR (STICKY MIDDLE) */}
        <div className="flex-[2] max-w-[600px] px-10">
          <div className="bg-slate-100 border border-slate-100 rounded-lg px-5 py-4 flex items-center gap-6 group focus-within:bg-white focus-within:border-primary/30 transition-all duration-500">
            <BiSearch className="text-slate-400 text-2xl group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search Task, appointment or doctor name"
              className="bg-transparent border-none outline-none w-full text-sm  text-slate-800 placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* USER ACTIONS */}
        <div className="flex-1 flex items-center justify-end gap-6 pl-10">
          <div className="relative">
            <div
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className={`w-10 h-10 rounded-lg border border-slate-100 flex items-center justify-center cursor-pointer transition-all relative ${
                isNotificationOpen
                  ? "bg-primary text-white"
                  : "bg-white text-slate-400 hover:text-primary hover:bg-primary/5"
              }`}
            >
              <BiBell size={18} />
              <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-lg" />
            </div>

            {/* NOTIFICATION DROPDOWN: WIZARD STYLE */}
            {isNotificationOpen && (
              <div className="absolute top-[50px] right-0 w-[380px] bg-white border border-slate-200 rounded-lg p-6 animate-in zoom-in-95 slide-in-from-top-4 duration-300 z-50">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-bold text-slate-800 tracking-tight font-grotesk">
                    Health Notifications
                  </h4>
                  <button className="text-xs font-bold text-primary  tracking-normal hover:underline">
                    Mark all read
                  </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {[
                    {
                      id: "1",
                      title: "Medication Reminder",
                      desc: "Time for your 500mg Amoxicillin dose. Please confirm once taken.",
                      time: "2m ago",
                      icon: <BiCapsule />,
                      color: "text-supportive-teal bg-teal-50",
                      type: "medication",
                    },
                    {
                      id: "2",
                      title: "Lab Result Ready",
                      desc: "Your Full Blood Count results are now available for review from Clinpath.",
                      time: "1h ago",
                      icon: <BiPulse />,
                      color: "text-purple-500 bg-purple-50",
                      type: "lab",
                    },
                    {
                      id: "3",
                      title: "Appointment Accepted",
                      desc: "Your upcoming checkup with Dr. Nkosi has been scheduled for tomorrow at 10:30 AM.",
                      time: "3h ago",
                      icon: <BiCheckCircle />,
                      color: "text-emerald-500 bg-emerald-50",
                      type: "appointment",
                    },
                  ].map((notifItem, i) => (
                    <div
                      key={notifItem.id}
                      onClick={() => {
                        setSelectedNotification(notifItem);
                        setIsNotificationOpen(false);
                      }}
                      className="flex gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${notifItem.color}`}
                      >
                        {notifItem.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {notifItem.title}
                          </p>
                          <span className="text-xs text-slate-400 font-bold whitespace-nowrap ml-2">
                            {notifItem.time}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed truncate">
                          {notifItem.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={onNotificationClick}
                  className="w-full mt-6 bg-slate-100 hover:bg-primary hover:text-white py-3 rounded-lg text-xs font-bold text-slate-500  tracking-normal transition-all active:scale-95"
                >
                  Enter Action Center
                </button>
              </div>
            )}
          </div>
          <div className="w-10 h-10 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-slate-400 cursor-pointer  hover:text-primary hover:bg-primary/5 transition-all">
            <BiBookmark size={18} />
          </div>
        </div>

        <div className="group flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 pr-6 rounded-lg transition-all">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-white  group-hover:scale-105 transition-transform">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4493b8&color=fff`}
              alt="Avatar"
            />
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-sm font-medium text-slate-800 truncate">
              {name}
            </span>
            <span className="text-xs text-primary">Premium Patient</span>
          </div>
        </div>
      </header>

      {/* Notification Detailed Modal */}
      {selectedNotification && (
        <Modal
          isOpen={!!selectedNotification}
          onClose={() => setSelectedNotification(null)}
          title="Notification Details"
          width="md"
        >
          <div className="pt-2">
            <div className="flex items-start gap-4 mb-6">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-2xl ${selectedNotification.color}`}
              >
                {selectedNotification.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 leading-tight mb-2 font-grotesk">
                  {selectedNotification.title}
                </h3>
                <span className="text-xs font-bold  tracking-normal text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  {selectedNotification.time}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-8">
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                {selectedNotification.desc}
              </p>
            </div>

            {/* Contextual Actions based on type */}
            <div className="flex flex-col gap-3">
              {selectedNotification.type === "appointment" && (
                <div className="flex gap-3">
                  <button className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all">
                    <BiCalendarEdit size={16} /> Reschedule
                  </button>
                  <button className="flex-1 py-3.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs flex items-center justify-center gap-2 transition-all">
                    <BiCalendarX size={16} /> Cancel
                  </button>
                </div>
              )}
              {selectedNotification.type === "medication" && (
                <button className="w-full py-3.5 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-none shadow-primary/20">
                  <BiCheckCircle size={16} /> Mark as Taken
                </button>
              )}
              {selectedNotification.type === "lab" && (
                <button className="w-full py-3.5 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-none shadow-primary/20">
                  View Full Results
                </button>
              )}

              <button
                onClick={() => setSelectedNotification(null)}
                className="w-full py-3.5 mt-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-rose-500 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <BiTrash size={16} /> Delete Notification
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
