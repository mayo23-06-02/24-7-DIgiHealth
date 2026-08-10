"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, MessageSquare } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import LogoMain from "@/components/ui/LogoMain";
import {
  CHAT_UNREAD_EVENT,
  playMessageNotificationSound,
} from "@/lib/chatUnread";

import WeatherWidget from "./WeatherWidget";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import FamilySwitcher from "@/components/shared/FamilySwitcher";

export interface UnifiedHeaderProps {
  onNotificationClick?: () => void;
  onMenuClick?: () => void;
}

function formatUnreadBadge(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "";
  if (count > 99) return "99+";
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

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const fetchUnreadMessagesCount = useCallback(async (opts?: { isInitial?: boolean }) => {
    try {
      const res = await fetch("/api/chat/unread-count", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      const next =
        typeof data.unreadChats === "number"
          ? data.unreadChats
          : typeof data.unreadCount === "number"
            ? data.unreadCount
            : 0;
      const prev = previousUnreadRef.current;

      if (opts?.isInitial && !initialSoundPlayedRef.current) {
        initialSoundPlayedRef.current = true;
        if (next > 0) {
          playMessageNotificationSound();
        }
      } else if (prev !== null && next > prev) {
        playMessageNotificationSound();
      }

      previousUnreadRef.current = next;
      setUnreadMessagesCount(next);
    } catch {
      /* silent */
    }
  }, []);

  const hasMessages = user?.role === "patient" || user?.role === "practitioner";

  useEffect(() => {
    if (!hasMessages) return;

    void fetchUnreadMessagesCount({ isInitial: true });

    const interval = setInterval(() => {
      void fetchUnreadMessagesCount();
    }, 45_000);

    const onUnreadChanged = () => {
      void fetchUnreadMessagesCount();
    };
    window.addEventListener(CHAT_UNREAD_EVENT, onUnreadChanged);
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
  }, [fetchUnreadMessagesCount, hasMessages]);

  const formattedDate = time?.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const formattedTime = time?.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const badgeText = formatUnreadBadge(unreadMessagesCount);

  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-border bg-surface sticky top-0 z-30 backdrop-blur-sm">
      {/* Mobile menu + logo */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="w-10 h-10 rounded-md flex items-center justify-center text-ink-600 hover:bg-surface-soft transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <LogoMain width={140} height={180} alt={false} />
      </div>

      {/* Date / Time / Weather (desktop) */}
      <div className="hidden sm:flex flex-1 flex-col gap-1.5 pl-4 lg:pl-8">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-ink-400">{formattedDate}</span>
          <span className="w-0.5 h-0.5 bg-border rounded-full" />
          <span className="text-xs font-semibold text-primary">{formattedTime}</span>
        </div>
        <WeatherWidget />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-3 ml-auto">
        <FamilySwitcher variant="compact" />
        
        {/* Messages — only patient/practitioner have a messages inbox */}
        {hasMessages && (
          <Link href={`/${user?.role}/messages`}>
            <button
              type="button"
              className="w-10 h-10 rounded-md border border-border flex items-center justify-center cursor-pointer transition-all relative bg-surface text-ink-600 hover:text-primary hover:bg-surface-soft"
              aria-label={
                unreadMessagesCount > 0
                  ? `${unreadMessagesCount} unread chat${unreadMessagesCount === 1 ? "" : "s"}`
                  : "Messages"
              }
            >
              <MessageSquare size={18} />
              {badgeText && (
                <div className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-danger-500 rounded-full flex items-center justify-center ">
                  <span className="text-[9px] leading-none text-white font-bold tabular-nums">
                    {badgeText}
                  </span>
                </div>
              )}
            </button>
          </Link>
        )}

        <NotificationBell onNotificationClick={onNotificationClick} />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
