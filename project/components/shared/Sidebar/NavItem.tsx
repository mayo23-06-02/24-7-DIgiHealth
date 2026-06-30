"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarItem } from "./types";

interface NavItemProps {
  item: SidebarItem;
  userRole: string;
  isCollapsed: boolean;
  onClose?: () => void;
}

export default function NavItem({ item, userRole, isCollapsed, onClose }: NavItemProps) {
  const pathname = usePathname();
  const href = item.href.replace("[role]", userRole);
  const isActive =
    pathname === href ||
    (href !== `/${userRole}` && pathname.startsWith(href));

  return (
    <Link
      href={href}
      title={isCollapsed ? item.label : ""}
      onClick={() => {
        if (window.innerWidth < 1024 && onClose) onClose();
      }}
    >
      <div
        className={`
          flex items-center gap-4 py-3 my-1 rounded-lg font-semibold text-sm transition-all duration-200 group
          ${isActive ? "bg-primary text-white" : "text-slate-900 hover:bg-slate-50 hover:text-primary"}
          ${isCollapsed ? "justify-center px-0" : "px-4"}
        `}
      >
        <item.icon
          size={22}
          className={`transition-transform duration-200 ${
            isActive ? "scale-110" : "group-hover:scale-110"
          }`}
        />
        {!isCollapsed && (
          <span className="animate-in fade-in slide-in-from-left-2 duration-300">
            {item.label}
          </span>
        )}
      </div>
    </Link>
  );
}