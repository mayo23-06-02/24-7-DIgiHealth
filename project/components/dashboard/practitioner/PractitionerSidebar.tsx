"use client";

import React, { useState } from "react";
import {
  BiHomeAlt,
  BiCalendar,
  BiGroup,
  BiPulse,
  BiNote,
  BiCog,
  BiLogOut,
  BiChevronLeft,
  BiChevronRight,
  BiMenuAltLeft,
  BiShieldPlus,
} from "react-icons/bi";

interface PractitionerSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  practitionerName?: string;
  specialisation?: string;
}

const mainNav = [
  { name: "Dashboard", icon: <BiHomeAlt size={20} /> },
  { name: "Queue", icon: <BiGroup size={20} /> },
  { name: "Calendar", icon: <BiCalendar size={20} /> },
  { name: "Patients", icon: <BiPulse size={20} /> },
  { name: "Notes", icon: <BiNote size={20} /> },
];

import Button from "@/components/ui/Button";

export default function PractitionerSidebar({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  practitionerName = "Dr. Sipho Nkosi",
  specialisation = "General Practitioner",
}: PractitionerSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const initials = practitionerName
    .split(" ")
    .filter((w) => w.startsWith("Dr.") === false)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-4 left-4 lg:sticky lg:top-0 lg:left-0 lg:h-screen
          bg-[#020c20]  border-r border-white/5
          transition-all duration-500 ease-out flex flex-col z-[100]
          rounded-[28px] lg:rounded-none
          ${isCollapsed ? "w-[72px]" : "w-64"}
          ${isOpen ? "translate-x-0" : "-translate-x-[120%] lg:translate-x-0"}
        `}
      >
        {/* Mobile close */}
        <Button
          variant="white"
          onClick={onClose}
          className="absolute -right-12 top-4 w-10 h-10 p-0 rounded-full flex items-center justify-center text-slate-500 shadow-none lg:hidden !min-w-0"
        >
          ×
        </Button>

        {/* Brand */}
        <div
          className={`flex items-center gap-3 p-5 border-b border-white/5 shrink-0 ${isCollapsed ? "justify-center px-3" : ""}`}
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-supportive-teal flex items-center justify-center shadow-none shrink-0">
            <BiShieldPlus className="text-white text-lg" />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="font-bold text-white text-xs tracking-normal  leading-tight opacity-90">
                24/7 DigiHealth
              </p>
              <p className="text-sm text-blue-400 font-bold  tracking-normal mt-1">
                Clinical Portal
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {mainNav.map((item) => {
            const isActive = activeTab === item.name;
            return (
              <Button
                key={item.name}
                variant={isActive ? "primary" : "ghost"}
                onClick={() => {
                  onTabChange(item.name);
                  onClose?.();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg font-bold text-sm  tracking-normal
                  transition-all duration-200 group border-none h-auto !min-w-0
                  ${isCollapsed ? "justify-center" : "justify-start"}
                  ${
                    isActive
                      ? "bg-primary text-white shadow-none shadow-primary/20"
                      : "text-slate-500 hover:bg-white/5 hover:text-white"
                  }
                `}
                title={isCollapsed ? item.name : ""}
              >
                <span
                  className={`shrink-0 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}
                >
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="animate-in fade-in duration-200">
                    {item.name}
                  </span>
                )}
                {!isCollapsed && isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                )}
              </Button>
            );
          })}
        </nav>

        {/* Profile + Collapse */}
        <div className="p-3 border-t border-white/5 space-y-3 shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-supportive-teal flex items-center justify-center text-white text-xs font-bold shadow-none shadow-primary/20 shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                <p className="text-[11px] font-bold text-white truncate  tracking-tight">
                  {practitionerName}
                </p>
                <p className="text-[9px] font-bold text-blue-400 truncate  tracking-normal mt-0.5">
                  {specialisation || "General Practitioner"}
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all text-sm font-bold  tracking-normal border-none h-auto !min-w-0 hidden lg:flex"
            >
              {isCollapsed ? (
                <BiChevronRight size={18} />
              ) : (
                <>
                  <BiChevronLeft size={18} />
                  <span>Collapse</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-10 h-10 p-0 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 transition-all border-none h-auto !min-w-0"
            >
              <BiLogOut size={18} />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
