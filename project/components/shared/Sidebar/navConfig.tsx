import { SidebarItem } from "./types";
import {
  BiHomeAlt,
  BiCalendar,
  BiUser,
  BiCheckCircle,
  BiBuildingHouse,
  BiShieldQuarter,
  BiBarChartAlt2,
  BiMessageDetail,
  BiGroup,
  BiDollarCircle,
  BiClipboard,
  BiFile,
  BiStats,
  BiUserPlus,
  BiBell,
  BiWallet,
  BiStar,
  BiLineChart,
} from "react-icons/bi";

export const MAIN_NAV: SidebarItem[] = [
  // PATIENT
  {
    icon: BiHomeAlt,
    label: "Home",
    href: "/[role]",
    roles: ["patient", "practitioner", "inspector", "super_admin", "mega_admin"],
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
  // PRACTITIONER
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
  // HOSPITAL ADMIN
  {
    icon: BiBuildingHouse,
    label: "Facility Dashboard",
    href: "/[role]/dashboard",
    roles: ["hospital_admin"],
  },
  {
    icon: BiUserPlus,
    label: "Staff Management",
    href: "/[role]/staff",
    roles: ["hospital_admin"],
  },
  {
    icon: BiFile,
    label: "Reports",
    href: "/[role]/reports",
    roles: ["hospital_admin"],
  },
  {
    icon: BiLineChart,
    label: "Performance",
    href: "/[role]/performance",
    roles: ["hospital_admin"],
  },
  {
    icon: BiClipboard,
    label: "SLA",
    href: "/[role]/sla",
    roles: ["hospital_admin"],
  },
  {
    icon: BiStar,
    label: "Reviews",
    href: "/[role]/reviews",
    roles: ["hospital_admin"],
  },
  // INSPECTOR
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
  // SUPER ADMIN & MEGA ADMIN
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
  // COMMON
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
    roles: ["patient", "practitioner", "super_admin", "mega_admin", "inspector"],
  },
  {
    icon: BiUser,
    label: "Profile",
    href: "/[role]/profile",
    roles: ["patient", "practitioner", "hospital_admin", "inspector", "super_admin", "mega_admin"],
  },
];