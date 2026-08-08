"use client";

import React from "react";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
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
        flex items-center gap-3 py-3 px-4 font-medium text-sm transition-all duration-200 group rounded-xl
        ${isActive
          ? "bg-primary text-white  "
          : "text-ink-700 hover:bg-primary/8 hover:text-primary hover:"
        }
        ${isCollapsed ? "justify-center px-2" : ""}
        ${pending ? "opacity-60" : ""}
      `}
    >
      {pending ? (
        <Loader2 size={18} className="animate-spin shrink-0" />
      ) : (
        <item.icon
          size={18}
          className={`transition-all duration-200 shrink-0 ${
            isActive ? "" : "group-hover:scale-110 group-hover:rotate-6"
          }`}
        />
      )}
      {!isCollapsed && (
        <span className="truncate leading-tight">
          {item.label}
        </span>
      )}
    </div>
  );
}
