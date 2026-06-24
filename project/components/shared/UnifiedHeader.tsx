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
  BiChat,
  BiUser,
  BiCog,
  BiLogOut,
  BiHeart,
  BiChevronDown,
} from "react-icons/bi";
import { useAuthContext } from "../auth/AuthProvider";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import Modal from "../ui/Modal";
import { getSocket } from "@/lib/socket";
import toast from "react-hot-toast";
import LogoMain from "../ui/LogoMain";

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
  const { user, logout } = useAuthContext();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [time, setTime] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherData>({
    temp: 24,
    condition: "Loading...",
    location: "Detecting location...",
    icon: <BiSun className="text-gray-400 text-xl animate-pulse" />,
  });

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const profileRef = React.useRef<HTMLDivElement>(null);

  const fetchUnreadMessagesCount = async () => {
    try {
      const res = await fetch("/api/chat/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadMessagesCount(data.unreadCount);
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchUnreadMessagesCount();
    const interval = setInterval(fetchUnreadMessagesCount, 60000); // Backup polling
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Use a small delay to ensure cookie is set/ready if needed
    const timer = setTimeout(() => {
      const socket = getSocket();
      if (!socket.connected) {
        socket.connect();
      }

      socket.on("new:message", (message: any) => {
        if (message.receiverId === user.id) {
          setUnreadMessagesCount((prev) => prev + 1);
          // Alert user
          toast.success(
            `New message from ${message.senderName || "Practitioner"}`,
            {
              icon: "💬",
              duration: 5000,
            },
          );
        }
      });

      socket.on("incoming:call", (call: any) => {
        // This assumes we add incoming:call event to server.ts
        toast(`Incoming ${call.type} call...`, {
          icon: "📞",
          duration: 10000,
          style: {
            background: "#0052CC",
            color: "#fff",
          },
        });
      });

      return () => {
        socket.off("new:message");
        socket.off("incoming:call");
      };
    }, 1000);

    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          0: { label: "Clear", icon: <BiSun className="text-gray-400" /> },
          1: {
            label: "Mainly Clear",
            icon: <BiSun className="text-gray-300" />,
          },
          2: {
            label: "Partly Cloudy",
            icon: <BiCloud className="text-slate-500" />,
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
            icon: <BiCloudLightning className="text-gray-600" />,
          },
          71: {
            label: "Snowy",
            icon: <BiCloudSnow className="text-sky-100" />,
          },
        };

        const { label, icon } = mapping[current.weathercode] || {
          label: "Cloudy",
          icon: <BiCloud className="text-slate-500" />,
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
          icon: <BiSun className="text-gray-400" />,
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

  const handleNotifClick = async (notif: any) => {
    if (!notif.isRead) {
      await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id: notif._id }),
        headers: { "Content-Type": "application/json" },
      });
      fetchNotifications();
    }
    setSelectedNotif(notif);
    setIsNotificationOpen(false);
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
        <LogoMain width={150} height={200} alt={false} />
      </div>

      <div className="hidden sm:flex flex-1 flex-col gap-1 pr-4 lg:pr-10">
        <div className="flex items-center gap-2">
          <h1 className="text-xs  text-slate-500 ">{formattedDate}</h1>
          <span className="w-1 h-1 bg-slate-200 rounded-full" />
          <h1 className="text-xs font-bold text-primary ">{formattedTime}</h1>
        </div>
        <div className="flex items-center gap-2 text-slate-800">
          <span className="text-sm">{weather.icon}</span>
          <p className="text-xs font-bold">
            {weather.temp}°C {weather.condition}
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-end gap-3 lg:gap-6">
        <div className="relative">
          <Link href={`/${user?.role}/messages`}>
            <button
              className={`w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center cursor-pointer transition-all relative bg-white text-slate-500 hover:text-primary hover:bg-primary/5`}
            >
              <BiChat size={20} />
              {unreadMessagesCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 border-2 border-white rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">
                    {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                  </span>
                </div>
              )}
            </button>
          </Link>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className={`w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center cursor-pointer transition-all relative ${
              isNotificationOpen
                ? "bg-primary text-white shadow-none shadow-primary/20"
                : "bg-white text-slate-500 hover:text-primary hover:bg-primary/5"
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
                  className="text-sm text-primary font-bold hover:underline"
                >
                  Mark all read
                </button>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                {notifications.length === 0 ? (
                  <p className="text-center text-slate-500 py-10 text-xs">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.map((notif, i) => (
                    <div
                      key={notif._id || i}
                      className={`flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group ${!notif.isRead ? "bg-primary/[0.03]" : ""}`}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.isRead ? "bg-slate-50 text-slate-500" : "bg-primary/10 text-primary"}`}
                      >
                        {notif.type === "new_appointment" ||
                        notif.type === "appointment" ? (
                          <BiCalendar />
                        ) : notif.type === "message" ||
                          notif.type === "new_message" ? (
                          <BiChat />
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
                          <span className="text-[9px] text-slate-500 font-bold ml-2">
                            {new Date(notif.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
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

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`group flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-full transition-all ml-2 ${isProfileOpen ? "bg-slate-50  ring-primary/10" : ""}`}
          >
            <Avatar
              name={user?.name || "User"}
              src={user?.avatarUrl}
              size="sm"
              className="group-hover:scale-105"
            />
            <div className="hidden lg:flex flex-col items-start mr-2">
              <h1 className="font-bold text-slate-800 truncate leading-none mb-1">
                {user?.name || "User"}
              </h1>
              <h1 className="text-[9px] font-bold text-primary leading-none st">
                {user?.role?.replace("_", " ") || "Member"}
              </h1>
            </div>
            <BiChevronDown
              size={18}
              className={`text-slate-500 transition-transform duration-300 hidden sm:block ${isProfileOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 py-3 z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
              <div className="px-5 py-3 border-b border-slate-100 mb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Quick Actions
                </p>
              </div>

              <Link
                href={`/${user?.role}/profile`}
                className="flex items-center gap-3 px-5 py-3 text-slate-700 hover:bg-primary/5 hover:text-primary transition-all group"
                onClick={() => setIsProfileOpen(false)}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary/10">
                  <BiUser size={18} />
                </div>
                <span className="text-sm font-bold">My Profile</span>
              </Link>

              <div className="h-px bg-slate-100 my-2" />

              <button
                className="w-full flex items-center gap-3 px-5 py-3 text-slate-700 hover:bg-slate-50 transition-all group"
                onClick={() => {
                  setIsProfileOpen(false);
                  logout();
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-200">
                  <BiLogOut size={18} />
                </div>
                <span className="text-sm font-bold">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Notification Detail Modal */}
      <Modal
        isOpen={!!selectedNotif}
        onClose={() => setSelectedNotif(null)}
        title={selectedNotif?.title || "Activity Detail"}
      >
        {selectedNotif && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-5">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${
                  selectedNotif.type?.includes("appointment")
                    ? "bg-emerald-50 text-emerald-500 border border-emerald-100"
                    : selectedNotif.type?.includes("message")
                      ? "bg-blue-50 text-blue-500 border border-blue-100"
                      : "bg-primary/5 text-primary border border-primary/10"
                }`}
              >
                {selectedNotif.type?.includes("appointment") ? (
                  <BiCalendar />
                ) : selectedNotif.type?.includes("message") ? (
                  <BiChat />
                ) : (
                  <BiBell />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">
                  {selectedNotif.type?.replace("_", " ") || "Notification"}
                </h4>
                <p className="text-xs font-bold text-slate-500">
                  {new Date(selectedNotif.createdAt).toLocaleString("en-ZA", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
              <p className="text-lg text-slate-700 leading-relaxed font-medium">
                {selectedNotif.body}
              </p>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              {selectedNotif.type?.includes("appointment") && (
                <Link
                  href={`/${user?.role}/appointments`}
                  className="w-full"
                  onClick={() => setSelectedNotif(null)}
                >
                  <Button fullWidth size="lg">
                    Manage Appointment
                  </Button>
                </Link>
              )}
              {selectedNotif.type?.includes("message") && (
                <Link
                  href={`/${user?.role}/messages`}
                  className="w-full"
                  onClick={() => setSelectedNotif(null)}
                >
                  <Button fullWidth size="lg">
                    Reply to Message
                  </Button>
                </Link>
              )}
              {!selectedNotif.type?.includes("appointment") &&
                !selectedNotif.type?.includes("message") && (
                  <Link
                    href={`/${user?.role}/dashboard`}
                    className="w-full"
                    onClick={() => setSelectedNotif(null)}
                  >
                    <Button fullWidth size="lg">
                      Go to Dashboard
                    </Button>
                  </Link>
                )}
              <Button
                variant="white"
                fullWidth
                size="lg"
                onClick={() => setSelectedNotif(null)}
              >
                Close Activity
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </header>
  );
};

export default UnifiedHeader;
