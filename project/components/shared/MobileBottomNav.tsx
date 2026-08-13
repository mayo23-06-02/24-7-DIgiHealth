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
      className="flex min-h-[48px] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg"
      aria-current={active ? "page" : undefined}
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.4 : 2}
        className={active ? "text-primary" : "text-ink-400"}
      />
      <span
        className={`text-[10px] font-medium leading-none ${
          active ? "text-primary" : "text-ink-400"
        }`}
      >
        {item.label}
      </span>
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
      className="fixed inset-x-0 bottom-0 z-[70] lg:hidden"
      aria-label="Primary"
    >
      <div className="relative">
        <div
          className="flex items-stretch justify-around border-t border-border bg-white px-1 pt-1.5"
          style={{ paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom))" }}
        >
          {config.left.map((item) => (
            <SideTab key={item.href} item={item} active={isActive(pathname, item.href, homeHref)} />
          ))}

          {/* Spacer reserving the middle slot's width so the 4 side tabs stay evenly spaced */}
          <div className="w-16 shrink-0" aria-hidden="true" />

          {config.right.map((item) => (
            <SideTab key={item.href} item={item} active={isActive(pathname, item.href, homeHref)} />
          ))}
        </div>

        <Link
          href={config.middle.href}
          aria-current={middleActive ? "page" : undefined}
          aria-label={config.middle.label}
          className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 touch-manipulation flex-col items-center gap-1"
        >
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform active:scale-95 ${
              middleActive ? "scale-105" : ""
            }`}
          >
            <MiddleIcon size={26} />
          </span>
          <span className="text-[10px] font-semibold text-primary">
            {config.middle.label}
          </span>
        </Link>
      </div>
    </nav>
  );
}
