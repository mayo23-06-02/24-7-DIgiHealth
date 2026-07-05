"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BiBell, BiCalendar, BiChat, BiChevronDown } from "react-icons/bi";
import { toast } from "react-hot-toast";
import { useAuthContext } from "@/components/auth/AuthProvider";
import Button from "@/components/ui/Button";
import { Notification } from "./types";

export default function NotificationBell({
  onNotificationClick,
}: {
  onNotificationClick?: () => void;
}) {
  const { user } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const playNotificationSound = () => {
    const audio = new Audio("/notification.m4a");
    audio.play().catch(() => {});
  };

  const fetchNotifications = async (isInitialLoad = false) => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        const newUnreadCount = data.filter((n: any) => !n.isRead).length;
        setUnreadCount(newUnreadCount);
        if (isInitialLoad && newUnreadCount > 0) {
          playNotificationSound();
        } else if (newUnreadCount > previousUnreadCount) {
          playNotificationSound();
        }
        setPreviousUnreadCount(newUnreadCount);
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsDetailOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ readAll: true }),
      headers: { "Content-Type": "application/json" },
    });
    fetchNotifications();
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id: notif._id }),
        headers: { "Content-Type": "application/json" },
      });
      fetchNotifications();
    }
    setSelectedNotif(notif);
    setIsDetailOpen(true);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10  flex items-center justify-center cursor-pointer transition-all relative ${
          isOpen
            ? "bg-primary text-white shadow-primary/20"
            : " text-slate-500 hover:text-primary hover:bg-primary/5"
        }`}
      >
        <BiBell size={20} />
        {unreadCount > 0 && (
          <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-[56px] right-0 w-[350px] bg-white border border-slate-200 rounded-lg shadow-lg p-6 animate-in zoom-in-95 slide-in-from-top-4 duration-300 z-50">
          {!isDetailOpen ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-slate-800 font-grotesk">
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
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group ${
                        !notif.isRead ? "bg-primary/[0.03]" : ""
                      }`}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          notif.isRead
                            ? "bg-slate-50 text-slate-500"
                            : "bg-primary/10 text-primary"
                        }`}
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
                            className={`text-xs font-bold truncate ${
                              notif.isRead ? "text-slate-500" : "text-slate-800"
                            }`}
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
                  setIsOpen(false);
                  onNotificationClick?.();
                }}
              >
                Close
              </Button>
            </>
          ) : (
            selectedNotif && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-4"
                >
                  <BiChevronDown size={20} className="rotate-90" />
                  <span className="text-sm font-bold">Back</span>
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
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
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                      {selectedNotif.type?.replace("_", " ") || "Notification"}
                    </h4>
                    <p className="text-xs font-bold text-slate-500">
                      {new Date(selectedNotif.createdAt).toLocaleString(
                        "en-ZA",
                        { dateStyle: "full", timeStyle: "short" },
                      )}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {selectedNotif.body}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {selectedNotif.type?.includes("appointment") && (
                    <Link
                      href={`/${user?.role}/appointments?tab=requests`}
                      className="w-full"
                      onClick={() => {
                        setIsDetailOpen(false);
                        setIsOpen(false);
                      }}
                    >
                      <Button className="py-2" fullWidth size="lg">
                        Manage Appointment
                      </Button>
                    </Link>
                  )}
                  {selectedNotif.type?.includes("message") && (
                    <Link
                      href={`/${user?.role}/messages`}
                      className="w-full"
                      onClick={() => {
                        setIsDetailOpen(false);
                        setIsOpen(false);
                      }}
                    >
                      <Button className="py-2" fullWidth size="lg">
                        Reply to Message
                      </Button>
                    </Link>
                  )}
                  {!selectedNotif.type?.includes("appointment") &&
                    !selectedNotif.type?.includes("message") && (
                      <Link
                        href={`/${user?.role}/dashboard`}
                        className="w-full"
                        onClick={() => {
                          setIsDetailOpen(false);
                          setIsOpen(false);
                        }}
                      >
                        <Button className="py-2" fullWidth size="lg">
                          Go to Dashboard
                        </Button>
                      </Link>
                    )}
                  <Button
                    variant="white"
                    fullWidth
                    size="lg"
                    className="py-2"
                    onClick={() => setIsDetailOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
