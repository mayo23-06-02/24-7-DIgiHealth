"use client";

import React, { useState } from "react";
import {
  BiHomeAlt,
  BiCalendar,
  BiTime,
  BiUser,
  BiPulse,
  BiCapsule,
  BiHistory,
  BiGlobe,
  BiSupport,
  BiCog,
  BiCheckCircle,
  BiChevronLeft,
  BiChevronRight,
  BiLogOut,
  BiShieldPlus,
} from "react-icons/bi";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { useAuthContext } from "@/components/auth/AuthProvider";

interface NavItem {
  name: string;
  icon: React.ReactNode;
  href?: string;
}

interface DashboardSidebarProps {
  activeNav: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({
  activeNav,
  onTabChange,
  isOpen,
  onClose,
}: DashboardSidebarProps) {
  const { user, logout } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const mainNav: NavItem[] = [
    { name: "Home", icon: <BiHomeAlt size={22} /> },
    { name: "Appointment", icon: <BiCalendar size={22} /> },
    { name: "Schedule", icon: <BiTime size={22} /> },
    { name: "Doctor", icon: <BiUser size={22} /> },
    { name: "Labs", icon: <BiPulse size={22} /> },
    { name: "Medicine", icon: <BiCapsule size={22} /> },
    { name: "Medical Test", icon: <BiHistory size={22} /> },
    { name: "Prescription", icon: <BiGlobe size={22} /> },
    { name: "Health Record", icon: <BiCheckCircle size={22} /> },
  ];

  const secondaryNav: NavItem[] = [
    { name: "General", icon: <BiCog size={22} /> },
    { name: "Language", icon: <BiGlobe size={22} /> },
    { name: "Support", icon: <BiSupport size={22} /> },
  ];

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
        fixed inset-y-4 left-4 lg:sticky lg:top-0 lg:left-0 lg:h-screen bg-white lg:bg-white/90 lg:backdrop-blur-md border-r border-slate-200/50 
        transition-all duration-500 ease-out flex flex-col z-[100] rounded-lg lg:rounded-none
        ${isCollapsed ? "w-24" : "w-72"}
        ${isOpen ? "translate-x-0" : "-translate-x-[110%] lg:translate-x-0"}
      `}
    >
      {/* Mobile Close Button */}
      <button 
        onClick={onClose}
        className="absolute -right-12 top-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 lg:hidden"
      >
        ×
      </button>
      {/* Toggle Button */}

      {/* Brand Section */}
      <div
        className={`pt-8 pb-6 px-2.5 transition-all border-b  border-slate-200/50 duration-500 ${isCollapsed ? "px-4" : "px-6"}`}
      >
        <div
          className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}
        >
          {/* Brand Icon – 24/7 TeleHealth style */}
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center ">
            <span className="text-white font-black text-xl">24</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-lg tracking-tight">
                24/7 TeleHealth
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-3 py-5 overflow-y-auto custom-scrollbar space-y-1"
      >
        {mainNav.map((item) => {
          const isActive = activeNav === item.name;
          return (
            <button
              key={item.name}
              onClick={() => onTabChange(item.name)}
              className={`
                w-full flex items-center gap-4 py-3 rounded-lg font-semibold text-sm
                transition-all duration-200 group
                ${
                  isActive
                    ? "bg-primary text-white "
                    : "text-slate-500 hover:bg-slate-100 hover:text-primary"
                }
                ${isCollapsed ? "justify-center" : "px-4"}
              `}
              title={isCollapsed ? item.name : ""}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={`text-xl transition-transform duration-200 ${isActive ? "scale-105" : "group-hover:scale-105"}`}
              >
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="animate-in fade-in slide-in-from-left-2 duration-300">
                  {item.name}
                </span>
              )}
            </button>
          );
        })}

        {/* Divider */}
        {!isCollapsed && (
          <div
            className="h-px bg-slate-200 my-3 mx-2"
          />
        )}

        {secondaryNav.map((item) => {
          const isActive = activeNav === item.name;
          return (
            <button
              key={item.name}
              onClick={() => onTabChange(item.name)}
              className={`
                w-full flex items-center gap-4 py-3 rounded-lg font-semibold text-sm
                transition-all duration-200 group
                ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-primary"
                }
                ${isCollapsed ? "justify-center" : "px-4"}
              `}
              title={isCollapsed ? item.name : ""}
            >
              <span className="text-xl">{item.icon}</span>
              {!isCollapsed && <span>{item.name}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-100 mt-auto">
        {/* Profile Preview (optional) – shows when expanded */}
        {!isCollapsed && (
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-slate-50">
            <Avatar 
              name={user?.name || "User"} 
              size="sm" 
              className="rounded-lg shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {user?.name || "Member"}
              </p>
              <p className="text-[10px] text-primary font-black uppercase tracking-widest truncate">
                {user?.role?.replace("_", " ") || "Patient"}
              </p>
            </div>
          </div>
        )}

        {/* Sign Out Button */}
        <Button
          variant="outline"
          onClick={logout}
          className="w-full"
          aria-label="Sign out"
        >
          <BiLogOut size={20} />
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </div>

      {/* Custom scrollbar styles – add to global CSS or here via style tag */}
    </aside>
    </>
  );
}
