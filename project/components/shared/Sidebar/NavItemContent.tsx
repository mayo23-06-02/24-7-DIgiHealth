"use client";

import React from "react";
import { useLinkStatus } from "next/link";
import { BiLoaderAlt } from "react-icons/bi";
import { SidebarItem } from "./types";

interface NavItemContentProps {
  item: SidebarItem;
  isActive: boolean;
  isCollapsed: boolean;
}

/**
 * The inner row of a sidebar NavItem.
 *
 * Split out of NavItem purely so `useLinkStatus()` can be called from a
 * descendant of <Link> — that's a hard requirement of the hook. Outside a
 * <Link> it safely defaults to `{ pending: false }` rather than throwing.
 */
export default function NavItemContent({
  item,
  isActive,
  isCollapsed,
}: NavItemContentProps) {
  const { pending } = useLinkStatus();

  return (
    <div
      className={`
        flex items-center gap-4 py-3 my-1 rounded-lg font-semibold text-sm transition-all duration-200 group
        ${isActive ? "bg-primary text-white" : "text-slate-900 hover:bg-slate-50 hover:text-primary"}
        ${isCollapsed ? "justify-center px-0" : "px-4"}
        ${pending ? "opacity-70" : ""}
      `}
    >
      {pending ? (
        <BiLoaderAlt size={22} className="animate-spin shrink-0" />
      ) : (
        <item.icon
          size={22}
          className={`transition-transform duration-200 ${
            isActive ? "scale-110" : "group-hover:scale-110"
          }`}
        />
      )}
      {!isCollapsed && <span>{item.label}</span>}
    </div>
  );
}
