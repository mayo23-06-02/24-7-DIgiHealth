"use client";

import React, { useState } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import LogoMain from "@/components/ui/LogoMain";
import NavItem from "./NavItem";
import UserProfile from "./UserProfile";
import CollapseToggle from "./CollapseToggle";
import { MAIN_NAV } from "./navConfig";
import { SidebarProps } from "./types";

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user) return null;

  const filteredNav = MAIN_NAV.filter((item) =>
    item.roles?.includes(user.role)
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-90 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-100 flex flex-col bg-white transition-all duration-500
          lg:relative lg:inset-auto lg:border-r lg:border-slate-200/50 lg:shadow-none
          ${isCollapsed ? "w-24" : "w-72"}
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Mobile Close Button */}
        {isOpen && (
          <button
            onClick={onClose}
            className="absolute -right-12 top-6 w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-md lg:hidden"
            aria-label="Close menu"
          >
            ×
          </button>
        )}

        {/* Brand */}
        <div
          className={`
            h-16 flex items-center border-b border-slate-200/50 transition-all duration-500
            ${isCollapsed ? "px-4 justify-center" : "px-8"}
          `}
        >
          {!isCollapsed && <LogoMain width={150} height={200} alt={false} />}
          {isCollapsed && <LogoMain width={50} height={50} alt={false} />}
        </div>

        {/* Navigation */}
        <nav
          className={`
            flex-1 py-6 space-y-1 overflow-y-auto custom-scrollbar
            ${isCollapsed ? "px-2" : "px-4"}
          `}
        >
          {filteredNav.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              userRole={user.role}
              isCollapsed={isCollapsed}
              onClose={onClose}
            />
          ))}
        </nav>

        {/* User Profile */}
        <UserProfile isCollapsed={isCollapsed} onClose={onClose} />

        {/* Collapse Toggle */}
        <CollapseToggle
          isCollapsed={isCollapsed}
          onClick={() => setIsCollapsed(!isCollapsed)}
        />
      </aside>
    </>
  );
}