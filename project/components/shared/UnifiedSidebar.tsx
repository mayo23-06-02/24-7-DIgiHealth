"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BiHomeAlt,
  BiCalendar,
  BiUser,
  BiGlobe,
  BiCheckCircle,
  BiBuildingHouse,
  BiShieldQuarter,
  BiBarChartAlt2,
  BiMessageDetail,
  BiCog,
  BiSupport,
  BiGroup,
  BiDollarCircle,
  BiClipboard,
  BiFile,
  BiStats,
  BiUserPlus,
  BiBell,
  BiWallet,
  BiHeart,
  BiLogOut,
  BiChevronRight,
  BiChevronLeft,
  BiStar,
  BiLineChart,
} from "react-icons/bi";
import { useAuthContext } from "../auth/AuthProvider";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";

interface SidebarItem {
  icon: any;
  label: string;
  href: string;
  roles: string[];
}

const MAIN_NAV: SidebarItem[] = [
  // ----- PATIENT PAGES -----
  {
    icon: BiHomeAlt,
    label: "Home",
    href: "/[role]",
    roles: [
      "patient",
      "practitioner",
      "hospital_admin",
      "inspector",
      "super_admin",
      "mega_admin",
    ],
    exact: true,
  },
  {
    icon: BiCalendar,
    label: "Appointments",
    href: "/[role]/appointments",
    roles: ["patient", "practitioner"],
  },
  {
    icon: BiUser,
    label: "Doctors",
    href: "/[role]/doctors",
    roles: ["patient"],
  },

  {
    icon: BiCheckCircle,
    label: "Health Record",
    href: "/[role]/health-record",
    roles: ["patient"],
  },

  // ----- PRACTITIONER PAGES -----
  {
    icon: BiUser,
    label: "Patients",
    href: "/[role]/patients",
    roles: ["practitioner"],
  },
  {
    icon: BiCalendar,
    label: "Consultations",
    href: "/[role]/consultations",
    roles: ["practitioner"],
  },
  {
    icon: BiStats,
    label: "Clinical Insights",
    href: "/[role]/insights",
    roles: ["practitioner"],
  },

  // ----- HOSPITAL ADMIN PAGES -----
  {
    icon: BiBuildingHouse,
    label: "Facility Dashboard",
    href: "/[role]/dashboard",
    roles: ["hospital_admin"],
  },
  {
    icon: BiUserPlus,
    label: "Staff",
    href: "/[role]/staff",
    roles: ["hospital_admin"],
  },
  {
    icon: BiDollarCircle,
    label: "Billing",
    href: "/[role]/billing",
    roles: ["hospital_admin"],
  },
  {
    icon: BiStar,
    label: "Reviews",
    href: "/[role]/reviews",
    roles: ["hospital_admin"],
  },
  {
    icon: BiClipboard,
    label: "SLA",
    href: "/[role]/sla",
    roles: ["hospital_admin"],
  },
  {
    icon: BiLineChart,
    label: "Performance",
    href: "/[role]/performance",
    roles: ["hospital_admin"],
  },

  // ----- INSPECTOR PAGES -----
  {
    icon: BiShieldQuarter,
    label: "Compliance Dashboard",
    href: "/[role]/dashboard",
    roles: ["inspector"],
  },
  {
    icon: BiFile,
    label: "Audit Logs",
    href: "/[role]/audit",
    roles: ["inspector"],
  },
  {
    icon: BiClipboard,
    label: "POPIA Reports",
    href: "/[role]/reports",
    roles: ["inspector"],
  },
  {
    icon: BiGroup,
    label: "Anomaly Heatmap",
    href: "/[role]/anomalies",
    roles: ["inspector"],
  },

  // ----- SUPER ADMIN & MEGA ADMIN PAGES -----
  {
    icon: BiGroup,
    label: "User Management",
    href: "/[role]/users",
    roles: ["super_admin", "mega_admin"],
  },
  {
    icon: BiBarChartAlt2,
    label: "System Analytics",
    href: "/[role]/analytics",
    roles: ["super_admin", "mega_admin"],
  },
  {
    icon: BiDollarCircle,
    label: "Revenue & Payouts",
    href: "/[role]/finance",
    roles: ["super_admin", "mega_admin"],
  },
  {
    icon: BiBell,
    label: "Alerts",
    href: "/[role]/alerts",
    roles: ["super_admin", "mega_admin"],
  },

  // ----- COMMON PAGES (multiple roles) -----
  {
    icon: BiMessageDetail,
    label: "Messages",
    href: "/[role]/messages",
    roles: ["patient", "practitioner"],
  },
  {
    icon: BiWallet,
    label: "Billing",
    href: "/[role]/billing",
    roles: [
      "patient",
      "practitioner",
      "super_admin",
      "mega_admin",
      "inspector",
    ],
  },
  {
    icon: BiHeart,
    label: "Wellness",
    href: "/[role]/wellness",
    roles: ["patient"],
  },
  {
    icon: BiUser,
    label: "Profile",
    href: "/[role]/profile",
    roles: [
      "patient",
      "practitioner",
      "hospital_admin",
      "inspector",
      "super_admin",
      "mega_admin",
    ],
  },
];

// ==================== SECONDARY NAVIGATION (Settings, etc.) ====================
const SECONDARY_NAV: SidebarItem[] = [
  {
    icon: BiCog,
    label: "General",
    href: "/settings",
    roles: [
      "patient",
      "practitioner",
      "hospital_admin",
      "inspector",
      "super_admin",
      "mega_admin",
    ],
  },
  {
    icon: BiGlobe,
    label: "Language",
    href: "/settings/language",
    roles: [
      "patient",
      "practitioner",
      "hospital_admin",
      "inspector",
      "super_admin",
      "mega_admin",
    ],
  },
  {
    icon: BiSupport,
    label: "Support",
    href: "/support",
    roles: [
      "patient",
      "practitioner",
      "hospital_admin",
      "inspector",
      "super_admin",
      "mega_admin",
    ],
  },
  {
    icon: BiShieldQuarter,
    label: "Privacy & POPIA",
    href: "/settings/privacy",
    roles: [
      "patient",
      "practitioner",
      "hospital_admin",
      "inspector",
      "super_admin",
      "mega_admin",
    ],
  },
];

interface UnifiedSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user) return null;

  const filteredMain = MAIN_NAV.filter((item) =>
    item.roles.includes(user.role),
  );
  const filteredSecondary = SECONDARY_NAV.filter((item) =>
    item.roles.includes(user.role),
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
        flex-col transition-all duration-500 z-[100] shrink-0
        fixed inset-y-0 left-0 bg-white  lg:shadow-none
        lg:relative lg:inset-auto lg:translate-x-0 lg:border-r lg:border-slate-200/50
        ${isCollapsed ? "w-24" : "w-72"}
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
    `}
      >
        {/* Mobile Close Button */}
        {isOpen && (
          <button
            onClick={onClose}
            className="absolute -right-12 top-6 w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 lg:hidden"
          >
            ×
          </button>
        )}
        {/* Brand */}
        <div
          className={`
        h-24 flex items-center border-b border-slate-200/50 transition-all duration-500
        ${isCollapsed ? "px-4 justify-center" : "px-8"}
      `}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-bold">
              24
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-slate-800 font-bold tracking-tight text-lg leading-none">
                  24/7 TeleHealth
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Nav Section */}
        <nav
          className={`
        flex-1 py-6 space-y-1 overflow-y-auto custom-scrollbar 
        ${isCollapsed ? "px-2" : "px-4"}
      `}
        >
          {filteredMain.map((item, i) => {
            const href = item.href.replace("[role]", user.role);
            const isActive =
              pathname === href ||
              (href !== `/${user.role}` && pathname.startsWith(href));
            return (
              <Link
                key={i}
                href={href}
                className={`
                flex items-center gap-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 group
                ${isActive ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50 hover:text-primary"}
                ${isCollapsed ? "justify-center px-0" : "px-4"}
              `}
                title={isCollapsed ? item.label : ""}
              >
                <item.icon
                  size={22}
                  className={`transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`}
                />
                {!isCollapsed && (
                  <span className="animate-in fade-in slide-in-from-left-2 duration-300">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Divider */}
          {!isCollapsed && <div className="h-px bg-slate-200 my-6 mx-2" />}

          {filteredSecondary.map((item, i) => {
            const href = item.href.replace("[role]", user.role);
            const isActive = pathname === href;
            return (
              <Link
                key={i}
                href={href}
                className={`
                flex items-center gap-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 group
                ${isActive ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100 hover:text-primary"}
                ${isCollapsed ? "justify-center px-0" : "px-4"}
              `}
                title={isCollapsed ? item.label : ""}
              >
                <item.icon size={22} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Profile/Footer */}
        <div className="p-4 border-t border-slate-100 mt-auto">
          {!isCollapsed && (
            <Link
              href={`/${user.role}/profile`}
              className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-primary/20 transition-all group"
            >
              <Avatar
                name={user.name}
                src={user.avatarUrl}
                size="sm"
                className="group-hover:scale-105"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-primary transition-colors">
                  {user.name}
                </p>
                <p className="text-xs text-slate-400 truncate  tracking-normal font-bold">
                  {user.role.replace("_", " ")}
                </p>
              </div>
            </Link>
          )}

          {isCollapsed && (
            <Link
              href={`/${user.role}/profile`}
              className="flex justify-center mb-4 p-2 rounded-lg hover:bg-slate-50 transition-all group"
              title="View Profile"
            >
              <Avatar
                name={user.name}
                src={user.avatarUrl}
                size="sm"
                className="group-hover:scale-110"
              />
            </Link>
          )}

          <Button
            onClick={logout}
            variant="white"
            icon={<BiLogOut size={20} />}
            iconPosition="left"
            className={`
            !w-full flex items-center transition-all bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-red-500 rounded-lg py-3 !min-w-0
            ${isCollapsed ? "!justify-center" : "!px-4 !gap-3"}
          `}
          >
            {!isCollapsed && (
              <span className="text-sm font-bold  tracking-normal">
                Sign Out
              </span>
            )}
          </Button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 w-6 h-6 p-0 min-w-0 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all z-50"
        >
          {isCollapsed ? (
            <BiChevronRight size={14} />
          ) : (
            <BiChevronLeft size={14} />
          )}
        </button>
      </aside>
    </>
  );
};

export default UnifiedSidebar;
