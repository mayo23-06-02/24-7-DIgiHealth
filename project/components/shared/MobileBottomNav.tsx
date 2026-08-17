"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  CheckCircle2,
  MessageSquare,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface RoleNav {
  left: [TabItem, TabItem];
  middle: TabItem;
  right: [TabItem, TabItem];
}

const NAV_BY_ROLE: Partial<Record<string, RoleNav>> = {
  patient: {
    left: [
      { href: "/patient", label: "Home", icon: Home },
      { href: "/patient/health-record", label: "Records", icon: CheckCircle2 },
    ],
    middle: { href: "/patient/appointments", label: "Appointments", icon: Calendar },
    right: [
      { href: "/patient/messages", label: "Messages", icon: MessageSquare },
      { href: "/patient/profile", label: "Profile", icon: User },
    ],
  },
  practitioner: {
    left: [
      { href: "/practitioner", label: "Home", icon: Home },
      { href: "/practitioner/patients", label: "Patients", icon: Users },
    ],
    middle: { href: "/practitioner/appointments", label: "Appointments", icon: Calendar },
    right: [
      { href: "/practitioner/messages", label: "Messages", icon: MessageSquare },
      { href: "/practitioner/profile", label: "Profile", icon: User },
    ],
  },
};

function isActive(pathname: string, href: string, homeHref: string) {
  if (href === homeHref) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`);
}

function SideTab({ item, active }: { item: TabItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="flex min-h-[48px] flex-1 touch-manipulation items-center justify-center rounded-lg"
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
    >
      <Icon
        size={24}
        strokeWidth={active ? 2.4 : 2}
        className={active ? "text-primary" : "text-ink-400"}
      />
    </Link>
  );
}

/**
 * Fixed 5-tab bar for phone-width viewports (patient/practitioner only —
 * other roles are desk-based back-office use, not phone-first).
 * The middle tab pops out above the bar as a raised circular bg-primary
 * button, the way iOS/Android tab bars commonly treat a primary action.
 */
export default function MobileBottomNav({ role }: { role: string }) {
  const pathname = usePathname();
  const config = NAV_BY_ROLE[role];
  if (!config) return null;

  const homeHref = config.left[0].href;
  const MiddleIcon = config.middle.icon;
  const middleActive = isActive(pathname, config.middle.href, homeHref);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[70] lg:hidden px-16 pb-48"
      aria-label="Primary"
    >
      <div
        className="flex items-stretch justify-around border-t rounded-full shadow-md backdrop-blur-3xl border-border  px-1 pt-1.5"
        style={{ paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom))" }}
      >
        {config.left.map((item) => (
          <SideTab key={item.href} item={item} active={isActive(pathname, item.href, homeHref)} />
        ))}

        <Link
          href={config.middle.href}
          aria-current={middleActive ? "page" : undefined}
          aria-label={config.middle.label}
          className="flex min-h-[48px] flex-1 touch-manipulation items-center justify-center rounded-lg"
        >
          <MiddleIcon
            size={24}
            strokeWidth={middleActive ? 2.4 : 2}
            className={middleActive ? "text-primary" : "text-ink-400"}
          />
        </Link>

        {config.right.map((item) => (
          <SideTab key={item.href} item={item} active={isActive(pathname, item.href, homeHref)} />
        ))}
      </div>
    </nav>
  );
}
