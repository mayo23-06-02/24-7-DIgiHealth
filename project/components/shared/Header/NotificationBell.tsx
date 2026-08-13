"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, Calendar, MessageSquare, ChevronDown } from "lucide-react";
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
  const previousUnreadCount = useRef(0);
  const previousNotifIds = useRef<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  // Dropdown is portaled to document.body (see render) so it always
  // composites above the patient dashboard's WebGL manikin canvas, which on
  // some devices ignores normal DOM z-index — it therefore falls outside
  // `ref`, so click-outside detection needs its own ref too.
  const dropdownRef = useRef<HTMLDivElement>(null);

  const playNotificationSound = () => {
    // Shared sound helper (same asset as message badge)
    try {
      const audio = new Audio("/notification.m4a");
      audio.volume = 0.7;
      void audio.play().catch(() => {});
    } catch {
      /* silent */
    }
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
        } else if (!isInitialLoad && newUnreadCount > previousUnreadCount.current) {
          playNotificationSound();
        }
        previousUnreadCount.current = newUnreadCount;

        // Let appointment lists refresh immediately when a new
        // reschedule/accept/cancel notification lands, instead of waiting
        // for their own poll cycle.
        if (!isInitialLoad) {
          const hasNewAppointmentNotif = data.some(
            (n: any) =>
              !previousNotifIds.current.has(n._id) &&
              String(n.type || "").startsWith("appointment"),
          );
          if (hasNewAppointmentNotif) {
            window.dispatchEvent(new Event("appointments:changed"));
          }
        }
        previousNotifIds.current = new Set(data.map((n: any) => n._id));
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    // Poll often so patients see prescription/appointment pings quickly
    const interval = setInterval(() => fetchNotifications(false), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = ref.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) {
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

  const handleRescheduleAction = async (
    notif: Notification,
    action: "accept" | "decline",
  ) => {
    const consultationId = notif.data?.consultationId;
    if (!consultationId) return;
    try {
      const res = await fetch(`/api/bookings/${consultationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "accept"
            ? { acceptReschedule: true }
            : { declineReschedule: true },
        ),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(
          action === "accept"
            ? "New time confirmed"
            : "Reschedule declined — original time kept",
        );
        window.dispatchEvent(new Event("appointments:changed"));
      } else {
        toast.error(json.error || "Unable to respond to reschedule");
      }
    } catch {
      toast.error("Unable to respond to reschedule");
    } finally {
      if (!notif.isRead) {
        await fetch("/api/notifications", {
          method: "PATCH",
          body: JSON.stringify({ id: notif._id }),
          headers: { "Content-Type": "application/json" },
        });
      }
      fetchNotifications();
    }
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
        className={`w-10 h-10 rounded-md flex items-center justify-center cursor-pointer transition-all relative border ${
          isOpen
            ? "bg-primary text-white border-primary"
            : "border-border text-ink-600 hover:text-primary hover:bg-surface-soft"
        }`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-danger-500 rounded-full flex items-center justify-center ">
            <span className="text-[9px] leading-none text-white font-bold tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
        )}
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          className="fixed top-16 left-0 right-0 sm:left-auto sm:right-6 mx-4 sm:mx-0 w-auto sm:w-96 bg-white border border-border rounded-lg shadow-xl p-4 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 z-[100] max-h-[600px] flex flex-col"
        >
          {!isDetailOpen ? (
            <>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-ink-900 font-grotesk">
                    Activity Center
                  </h3>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-semibold text-primary hover:text-primary-600 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell size={32} className="text-ink-400 mb-2 opacity-50" />
                    <p className="text-sm text-ink-600 font-medium">No notifications yet</p>
                    <p className="text-xs text-ink-400 mt-1">We'll let you know when something happens</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`flex gap-3 p-3 rounded-md transition-colors cursor-pointer group ${
                        !notif.isRead
                          ? "bg-primary-50 hover:bg-primary/10 border border-primary-500/20"
                          : "hover:bg-surface-soft"
                      }`}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <div
                        className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 flex-none ${
                          notif.isRead
                            ? "bg-surface-soft text-ink-400"
                            : notif.type?.includes("appointment")
                              ? "bg-success-50 text-success-700"
                              : notif.type?.includes("message")
                                ? "bg-info-50 text-info-700"
                                : "bg-primary-50 text-primary"
                        }`}
                      >
                        {notif.type?.includes("appointment") ||
                        notif.type === "new_appointment" ||
                        notif.type?.includes("booking") ? (
                          <Calendar size={16} />
                        ) : notif.type?.includes("prescription") ||
                          notif.type?.includes("clinical_record") ? (
                          <MessageSquare size={16} />
                        ) : notif.type === "message" ||
                          notif.type === "new_message" ? (
                          <MessageSquare size={16} />
                        ) : (
                          <Bell size={16} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <p
                            className={`text-xs font-semibold truncate ${
                              notif.isRead ? "text-ink-600" : "text-ink-900"
                            }`}
                          >
                            {notif.title}
                          </p>
                          <span className="text-[11px] text-ink-400 font-medium flex-shrink-0">
                            {new Date(notif.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className={`text-xs line-clamp-2 ${notif.isRead ? "text-ink-400" : "text-ink-600"}`}>
                          {notif.body}
                        </p>
                        {notif.type === "appointment_reschedule_request" && (
                          <div className="flex gap-2 mt-2.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRescheduleAction(notif, "accept");
                              }}
                              className="flex-1 rounded-md bg-success-500 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-success-600 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRescheduleAction(notif, "decline");
                              }}
                              className="flex-1 rounded-md border border-border px-2 py-1.5 text-[10px] font-bold text-ink-600 hover:bg-surface-soft transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-border">
                <Button
                  variant="ghost"
                  fullWidth
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    onNotificationClick?.();
                  }}
                >
                  View all notifications
                </Button>
              </div>
            </>
          ) : (
            selectedNotif && (
              <div className="animate-in slide-in-from-right-2 duration-200 flex flex-col h-full">
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="flex items-center gap-2 text-ink-600 hover:text-ink-900 transition-colors mb-4 -ml-1 pl-1 py-1"
                >
                  <ChevronDown size={18} className="rotate-90" />
                  <span className="text-sm font-semibold">Back</span>
                </button>

                <div className="flex items-start gap-3 mb-5 pb-4 border-b border-border">
                  <div
                    className={`w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 ${
                      selectedNotif.type?.includes("appointment")
                        ? "bg-success-50 text-success-700"
                        : selectedNotif.type?.includes("message")
                          ? "bg-info-50 text-info-700"
                          : "bg-primary-50 text-primary"
                    }`}
                  >
                    {selectedNotif.type?.includes("appointment") ? (
                      <Calendar size={20} />
                    ) : selectedNotif.type?.includes("message") ? (
                      <MessageSquare size={20} />
                    ) : (
                      <Bell size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-ink-400 uppercase tracking-wide mb-1">
                      {selectedNotif.type?.replace("_", " ") || "Notification"}
                    </h4>
                    <p className="text-xs font-medium text-ink-600">
                      {new Date(selectedNotif.createdAt).toLocaleString(
                        "en-ZA",
                        { dateStyle: "full", timeStyle: "short" },
                      )}
                    </p>
                  </div>
                </div>

                <div className="bg-surface-soft rounded-md p-4 mb-6 border border-border">
                  <h3 className="text-sm font-semibold text-ink-900 mb-2">
                    {selectedNotif.title}
                  </h3>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    {selectedNotif.body}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {selectedNotif.type === "appointment_reschedule_request" ? (
                    <div className="flex gap-3">
                      <Button
                        variant="white"
                        className="py-2"
                        fullWidth
                        size="lg"
                        onClick={() =>
                          handleRescheduleAction(selectedNotif, "decline")
                        }
                      >
                        Decline
                      </Button>
                      <Button
                        className="py-2"
                        fullWidth
                        size="lg"
                        onClick={() =>
                          handleRescheduleAction(selectedNotif, "accept")
                        }
                      >
                        Accept new time
                      </Button>
                    </div>
                  ) : (
                    selectedNotif.type?.includes("appointment") && (
                      <Link
                        href={`/${user?.role}/appointments?tab=requests&appointmentId=${selectedNotif.data?.consultationId || selectedNotif.data?.appointmentId}&modal=true`}
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
                    )
                  )}
                  {(selectedNotif.type?.includes("prescription") ||
                    selectedNotif.type?.includes("clinical_record")) && (
                    <>
                      <Link
                        href={
                          selectedNotif.data?.conversationId
                            ? `/${user?.role}/messages?chatId=${selectedNotif.data.conversationId}`
                            : `/${user?.role}/messages`
                        }
                        className="w-full"
                        onClick={() => {
                          setIsDetailOpen(false);
                          setIsOpen(false);
                        }}
                      >
                        <Button className="py-2" fullWidth size="lg">
                          Open in Messages
                        </Button>
                      </Link>
                      {user?.role === "patient" && (
                        <Link
                          href="/patient/health-record?tab=medications"
                          className="w-full"
                          onClick={() => {
                            setIsDetailOpen(false);
                            setIsOpen(false);
                          }}
                        >
                          <Button
                            variant="white"
                            className="py-2"
                            fullWidth
                            size="lg"
                          >
                            View in Health Records → Meds
                          </Button>
                        </Link>
                      )}
                    </>
                  )}
                  {selectedNotif.type?.includes("message") &&
                    !selectedNotif.type?.includes("prescription") &&
                    !selectedNotif.type?.includes("clinical_record") && (
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
                    !selectedNotif.type?.includes("message") &&
                    !selectedNotif.type?.includes("prescription") &&
                    !selectedNotif.type?.includes("clinical_record") && (
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
        </div>,
        document.body,
      )}
    </div>
  );
}
