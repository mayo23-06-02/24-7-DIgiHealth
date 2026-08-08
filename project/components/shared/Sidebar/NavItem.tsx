"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { SidebarItem } from "./types";
import NavItemContent from "./NavItemContent";

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

  const [isExpanded, setIsExpanded] = useState(isActive && !!item.children);
  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <Link
        href={href}
        title={isCollapsed ? item.label : ""}
        onClick={() => {
          if (window.innerWidth < 1024 && onClose) onClose();
        }}
      >
        <NavItemContent
          item={item}
          isActive={isActive}
          isCollapsed={isCollapsed}
        />
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        title={isCollapsed ? item.label : ""}
        className="w-full text-left"
      >
        <div className="relative">
          <NavItemContent
            item={item}
            isActive={isActive}
            isCollapsed={isCollapsed}
          />
          {!isCollapsed && (
            <ChevronDown
              size={16}
              className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          )}
        </div>
      </button>

      {isExpanded && !isCollapsed && (
        <div className="space-y-0.5 pl-6 border-l-2 border-primary/20 ml-3">
          {item.children.map((child) => {
            const childHref = child.href.replace("[role]", userRole);
            const isChildActive = pathname.includes(childHref.split("?")[0]) &&
              new URLSearchParams(childHref.split("?")[1] || "").get("tab") ===
              new URLSearchParams(pathname.split("?")[1] || "").get("tab");
            const ChildIcon = child.icon;

            return (
              <Link
                key={child.href}
                href={childHref}
                onClick={() => {
                  if (window.innerWidth < 1024 && onClose) onClose();
                }}
              >
                <div
                  className={`
                    flex items-center gap-2.5 py-2 px-3 text-xs font-medium rounded-md transition-all duration-200 group
                    ${isChildActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-ink-600 hover:bg-surface-soft hover:text-primary"
                    }
                  `}
                >
                  {ChildIcon && (
                    <ChildIcon
                      size={16}
                      className={`shrink-0 transition-all duration-200 ${
                        isChildActive ? "" : "group-hover:scale-110"
                      }`}
                    />
                  )}
                  <span className="truncate leading-tight">{child.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}