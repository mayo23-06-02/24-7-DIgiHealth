"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BiHomeAlt,
  BiCalendar,
  BiTime,
  BiUser,
  BiPulse,
  BiCapsule,
  BiHistory,
  BiGlobe,
  BiCheckCircle,
  BiBuildingHouse,
  BiFirstAid,
  BiShieldQuarter,
  BiBarChartAlt2,
  BiMessageDetail,
  BiCog,
  BiSupport,
  BiGroup,
  BiDollarCircle,
  BiBed,
  BiMap,
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
} from "react-icons/bi";
import { useAuthContext } from "../auth/AuthProvider";
import Avatar from "../ui/Avatar";

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
      "emt",
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
    icon: BiBed,
    label: "Bed Management",
    href: "/[role]/beds",
    roles: ["hospital_admin"],
  },
  {
    icon: BiUserPlus,
    label: "Staff",
    href: "/[role]/staff",
    roles: ["hospital_admin"],
  },
  {
    icon: BiBarChartAlt2,
    label: "Operational Analytics",
    href: "/[role]/analytics",
    roles: ["hospital_admin"],
  },

  // ----- EMT PAGES -----
  {
    icon: BiFirstAid,
    label: "Active Dispatches",
    href: "/[role]",
    roles: ["emt"],
  },
  {
    icon: BiHistory,
    label: "Dispatch History",
    href: "/[role]/dispatch/history",
    roles: ["emt"],
  },
  {
    icon: BiMap,
    label: "Incident Map",
    href: "/[role]/map",
    roles: ["emt"],
  },
  {
    icon: BiBuildingHouse,
    label: "Nearby Facilities",
    href: "/[role]/facilities",
    roles: ["emt"],
  },
  {
    icon: BiClipboard,
    label: "Equipment Check",
    href: "/[role]/equipment",
    roles: ["emt"],
  },
  {
    icon: BiFile,
    label: "Shift Reports",
    href: "/[role]/reports",
    roles: ["emt"],
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
    roles: ["patient", "practitioner", "hospital_admin", "super_admin", "mega_admin", "inspector"],
  },
  {
    icon: BiHeart,
    label: "Wellness",
    href: "/[role]/wellness",
    roles: ["patient"],
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
      "emt",
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
      "emt",
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
      "emt",
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
      "emt",
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
        fixed inset-y-0 left-0 bg-white shadow-2xl lg:shadow-none
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
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-black">
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
            <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate uppercase tracking-widest font-black">
                  {user.role.replace("_", " ")}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className={`
            w-full flex items-center transition-all bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-red-500 rounded-lg py-3
            ${isCollapsed ? "justify-center" : "px-4 gap-3"}
          `}
          >
            <BiLogOut size={20} />
            {!isCollapsed && (
              <span className="text-sm font-bold uppercase tracking-wider">
                Sign Out
              </span>
            )}
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all z-50"
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
