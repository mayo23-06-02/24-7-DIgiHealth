"use client";

import React from "react";
import Link from "next/link";
import { BiMenuAltLeft, BiChat } from "react-icons/bi";
import { useAuthContext } from "@/components/auth/AuthProvider";
import LogoMain from "@/components/ui/LogoMain";

// ── Import sub‑components (same folder) ──
import WeatherWidget from "./WeatherWidget";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

// ── Type definition (inline, no external types.ts needed) ──
export interface UnifiedHeaderProps {
  onNotificationClick?: () => void;
  onMenuClick?: () => void;
}

// ── Main Component ──
export default function Header({
  onNotificationClick,
  onMenuClick,
}: UnifiedHeaderProps) {
  const { user } = useAuthContext();
  const [time, setTime] = React.useState<Date | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = React.useState(0);

  // ── Clock ──
  React.useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Unread messages count ──
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

  React.useEffect(() => {
    fetchUnreadMessagesCount();
    const interval = setInterval(fetchUnreadMessagesCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Format date/time ──
  const formattedDate = time?.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = time?.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <header className="h-24 px-4 lg:px-10 flex items-center justify-between border-b border-slate-100 bg-white/70 backdrop-blur-xl sticky top-0 z-30 transition-all duration-500">
      {/* Mobile menu + logo */}
      <div className="flex items-center gap-4 lg:hidden mr-4">
        <button
          onClick={onMenuClick}
          className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
        >
          <BiMenuAltLeft size={24} />
        </button>
        <LogoMain width={150} height={200} alt={false} />
      </div>

      {/* Date / Time / Weather (desktop) */}
      <div className="hidden sm:flex flex-1 flex-col gap-1 pr-4 lg:pr-10">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{formattedDate}</span>
          <span className="w-1 h-1 bg-slate-200 rounded-full" />
          <span className="text-xs font-bold text-primary">{formattedTime}</span>
        </div>
        <WeatherWidget />
      </div>

      {/* Actions */}
      <div className="flex-1 flex items-center justify-end gap-3 lg:gap-6">
        {/* Messages */}
        <div className="relative">
          <Link href={`/${user?.role}/messages`}>
            <button
              className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center cursor-pointer transition-all relative bg-white text-slate-500 hover:text-primary hover:bg-primary/5"
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

        {/* Notifications */}
        <NotificationBell onNotificationClick={onNotificationClick} />

        {/* Profile */}
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}