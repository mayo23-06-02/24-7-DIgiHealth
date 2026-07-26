"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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