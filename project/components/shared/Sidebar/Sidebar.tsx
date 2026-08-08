"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import LogoMain from "@/components/ui/LogoMain";
import NavItem from "./NavItem";
import UserProfile from "./UserProfile";
import CollapseToggle from "./CollapseToggle";
import FavoriteDoctors from "./FavoriteDoctors";
import { MAIN_NAV } from "./navConfig";
import { SidebarProps } from "./types";

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!user) return null;

  const filteredNav = MAIN_NAV.filter((item) =>
    item.roles?.includes(user.role)
  );

  if (!isMounted) {
    return (
      <aside
        className="fixed inset-y-0 left-0 z-100 flex flex-col bg-white w-60 lg:relative lg:inset-auto lg:border-r lg:border-slate-200/50 lg:shadow-none -translate-x-full lg:translate-x-0"
      >
        {/* Placeholder to prevent hydration mismatch */}
      </aside>
    );
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-90 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-100 flex flex-col bg-gradient-to-b from-surface to-surface transition-all duration-300
          lg:relative lg:inset-auto lg:border-r lg:border-border/50 lg:shadow-sm lg:bg-surface
          ${isCollapsed ? "w-20" : "w-64"}
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          dark:lg:shadow-none dark:lg:border-border/30
        `}
      >
        {/* Mobile Close Button */}
        {isOpen && (
          <button
            onClick={onClose}
            className="absolute -right-12 top-4 w-10 h-10 bg-surface rounded-md flex items-center justify-center text-ink-600  lg:hidden hover:bg-surface-soft transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}

        {/* Brand */}
        <div
          className={`
            h-16 flex items-center border-b border-border transition-all duration-300
            ${isCollapsed ? "px-3 justify-center" : "px-6"}
          `}
        >
          {!isCollapsed && <LogoMain width={150} height={200} alt={false} />}
          {isCollapsed && <LogoMain width={44} height={44} alt={false} />}
        </div>

        {/* Navigation */}
        <nav
          className={`
            flex-1 py-5 overflow-y-auto custom-scrollbar
            ${isCollapsed ? "px-2 space-y-2" : "px-4 space-y-1"}
          `}
        >
          {filteredNav.map((item, idx) => (
            <React.Fragment key={item.href}>
              <NavItem
                item={item}
                userRole={user.role}
                isCollapsed={isCollapsed}
                onClose={onClose}
              />
              {/* Visual separator every 3-4 items for sophisticated grouping */}
              {!isCollapsed && idx === 0 && (
                <div className="my-2 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Favorite Doctors - Patient only */}
        {user.role === "patient" && (
          <FavoriteDoctors isCollapsed={isCollapsed} onClose={onClose} />
        )}

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