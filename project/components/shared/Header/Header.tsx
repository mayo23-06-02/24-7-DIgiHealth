"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BiMenuAltLeft, BiChat } from "react-icons/bi";
import { useAuthContext } from "@/components/auth/AuthProvider";
import LogoMain from "@/components/ui/LogoMain";
import {
  CHAT_UNREAD_EVENT,
  playMessageNotificationSound,
} from "@/lib/chatUnread";

import WeatherWidget from "./WeatherWidget";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

export interface UnifiedHeaderProps {
  onNotificationClick?: () => void;
  onMenuClick?: () => void;
}

function formatUnreadBadge(count: number): string {
  // Unlimited chat count (no 9+ cap) — one badge unit = one chat with unread mail
  if (!Number.isFinite(count) || count <= 0) return "";
  return String(Math.floor(count));
}

export default function Header({
  onNotificationClick,
  onMenuClick,
}: UnifiedHeaderProps) {
  const { user } = useAuthContext();
  const [time, setTime] = useState<Date | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const previousUnreadRef = useRef<number | null>(null);
  const initialSoundPlayedRef = useRef(false);

  // ── Clock (minute resolution is enough; avoid re-render every second) ──
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // ── Unread **chats** count (not individual messages) + sound ──
  const fetchUnreadMessagesCount = useCallback(async (opts?: { isInitial?: boolean }) => {
    try {
      const res = await fetch("/api/chat/unread-count", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      // Prefer explicit chat count; fall back to unreadCount from API
      const next =
        typeof data.unreadChats === "number"
          ? data.unreadChats
          : typeof data.unreadCount === "number"
            ? data.unreadCount
            : 0;
      const prev = previousUnreadRef.current;

      // Sound once on first successful load if there are unread chats
      if (opts?.isInitial && !initialSoundPlayedRef.current) {
        initialSoundPlayedRef.current = true;
        if (next > 0) {
          playMessageNotificationSound();
        }
      } else if (prev !== null && next > prev) {
        // New chat activity since last poll
        playMessageNotificationSound();
      }

      previousUnreadRef.current = next;
      setUnreadMessagesCount(next);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    void fetchUnreadMessagesCount({ isInitial: true });

    // Poll less aggressively; event + visibility refresh cover real-time updates
    const interval = setInterval(() => {
      void fetchUnreadMessagesCount();
    }, 45_000);

    const onUnreadChanged = () => {
      void fetchUnreadMessagesCount();
    };
    window.addEventListener(CHAT_UNREAD_EVENT, onUnreadChanged);
    // Refresh when tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchUnreadMessagesCount();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener(CHAT_UNREAD_EVENT, onUnreadChanged);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchUnreadMessagesCount]);

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

  const badgeText = formatUnreadBadge(unreadMessagesCount);

  return (
    <header className="h-16 px-4 lg:px-10 flex items-center justify-between border-b border-slate-100 bg-white/70 backdrop-blur-xl sticky top-0 z-30 transition-all duration-500">
      {/* Mobile menu + logo */}
      <div className="flex items-center gap-4 lg:hidden mr-4">
        <button
          type="button"
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
              type="button"
              className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center cursor-pointer transition-all relative bg-white text-slate-500 hover:text-primary hover:bg-primary/5"
              aria-label={
                unreadMessagesCount > 0
                  ? `${unreadMessagesCount} unread chat${unreadMessagesCount === 1 ? "" : "s"}`
                  : "Messages"
              }
            >
              <BiChat size={20} />
              {badgeText && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[10px] leading-none text-white font-bold tabular-nums">
                    {badgeText}
                  </span>
                </div>
              )}
            </button>
          </Link>
        </div>

        <NotificationBell onNotificationClick={onNotificationClick} />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
