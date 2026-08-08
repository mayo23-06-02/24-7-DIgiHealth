import { SidebarItem } from "./types";
import {
  Home,
  Calendar,
  CalendarDays,
  User,
  CheckCircle2,
  Building2,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  Users,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Activity,
  UserPlus,
  Bell,
  Wallet,
  Star,
  TrendingUp,
  Clock,
  AlertCircle,
  Heart,
  Pill,
  Stethoscope,
  FileCheck,
  Zap,
  Activity as BodyMapIcon,
  Syringe,
} from "lucide-react";

export const MAIN_NAV: SidebarItem[] = [
  // PATIENT
  {
    icon: Home,
    label: "Home",
    href: "/[role]",
    roles: ["patient", "practitioner", "inspector", "super_admin", "mega_admin"],
    exact: true,
  },
  {
    icon: CalendarDays,
    label: "Calendar",
    href: "/[role]/calendar",
    roles: ["patient"],
  },
  {
    icon: Calendar,
    label: "Appointments",
    href: "/[role]/appointments",
    roles: ["patient", "practitioner"],
    children: [
      {
        label: "All Appointments",
        href: "/[role]/appointments?tab=all",
        icon: Calendar,
      },
      {
        label: "Requests",
        href: "/[role]/appointments?tab=requests",
        icon: Bell,
      },
      {
        label: "Upcoming",
        href: "/[role]/appointments?tab=upcoming",
        icon: Clock,
      },
      {
        label: "Past",
        href: "/[role]/appointments?tab=past",
        icon: FileCheck,
      },
      {
        label: "Cancelled",
        href: "/[role]/appointments?tab=cancelled",
        icon: AlertCircle,
      },
    ],
  },
  {
    icon: User,
    label: "Doctors",
    href: "/[role]/doctors",
    roles: ["patient"],
  },
  {
    icon: CheckCircle2,
    label: "Health Record",
    href: "/[role]/health-record",
    roles: ["patient"],
    children: [
      {
        label: "Medical History",
        href: "/[role]/health-record?tab=timeline",
        icon: Heart,
      },
      {
        label: "Vitals",
        href: "/[role]/health-record?tab=vitals",
        icon: Zap,
      },
      {
        label: "Medications",
        href: "/[role]/health-record?tab=medications",
        icon: Pill,
      },
      {
        label: "Lab Results",
        href: "/[role]/health-record?tab=labs",
        icon: Stethoscope,
      },
      {
        label: "Allergies",
        href: "/[role]/health-record?tab=allergies",
        icon: AlertCircle,
      },
      {
        label: "Immunizations",
        href: "/[role]/health-record?tab=immunizations",
        icon: Syringe,
      },
    ],
  },
  // PRACTITIONER
  {
    icon: User,
    label: "Patients",
    href: "/[role]/patients",
    roles: ["practitioner"],
  },
  {
    icon: Calendar,
    label: "Consultations",
    href: "/[role]/consultations",
    roles: ["practitioner"],
  },
  {
    icon: Activity,
    label: "Clinical Insights",
    href: "/[role]/insights",
    roles: ["practitioner"],
  },
  // HOSPITAL ADMIN
  {
    icon: Building2,
    label: "Facility Dashboard",
    href: "/[role]/dashboard",
    roles: ["hospital_admin"],
  },
  {
    icon: UserPlus,
    label: "Staff Management",
    href: "/[role]/staff",
    roles: ["hospital_admin"],
  },
  {
    icon: FileText,
    label: "Reports",
    href: "/[role]/reports",
    roles: ["hospital_admin"],
  },
  {
    icon: TrendingUp,
    label: "Performance",
    href: "/[role]/performance",
    roles: ["hospital_admin"],
  },
  {
    icon: ClipboardList,
    label: "SLA",
    href: "/[role]/sla",
    roles: ["hospital_admin"],
  },
  {
    icon: Star,
    label: "Reviews",
    href: "/[role]/reviews",
    roles: ["hospital_admin"],
  },
  // INSPECTOR
  {
    icon: ShieldCheck,
    label: "Compliance Dashboard",
    href: "/[role]/dashboard",
    roles: ["inspector"],
  },
  {
    icon: FileText,
    label: "Audit Logs",
    href: "/[role]/audit",
    roles: ["inspector"],
  },
  {
    icon: ClipboardList,
    label: "POPIA Reports",
    href: "/[role]/reports",
    roles: ["inspector"],
  },
  {
    icon: Users,
    label: "Anomaly Heatmap",
    href: "/[role]/anomalies",
    roles: ["inspector"],
  },
  // SUPER ADMIN & MEGA ADMIN
  {
    icon: Users,
    label: "User Management",
    href: "/[role]/users",
    roles: ["super_admin", "mega_admin"],
  },
  {
    icon: Building2,
    label: "Facilities",
    href: "/[role]/facilities",
    roles: ["super_admin", "mega_admin"],
  },
  {
    icon: BarChart3,
    label: "System Analytics",
    href: "/[role]/analytics",
    roles: ["super_admin", "mega_admin"],
  },
  {
    icon: CircleDollarSign,
    label: "Revenue & Payouts",
    href: "/[role]/finance",
    roles: ["super_admin", "mega_admin"],
  },
  {
    icon: FileText,
    label: "Platform Reports",
    href: "/[role]/reports",
    roles: ["super_admin", "mega_admin"],
  },
  {
    icon: Bell,
    label: "Alerts",
    href: "/[role]/alerts",
    roles: ["super_admin", "mega_admin"],
  },
  {
    icon: ClipboardList,
    label: "Audit Log",
    href: "/[role]/audit",
    roles: ["super_admin", "mega_admin"],
  },
  {
    icon: ShieldCheck,
    label: "System Settings",
    href: "/[role]/settings",
    roles: ["super_admin", "mega_admin"],
  },
  // COMMON
  {
    icon: MessageSquare,
    label: "Messages",
    href: "/[role]/messages",
    roles: ["patient", "practitioner"],
  },
  {
    icon: Wallet,
    label: "Billing",
    href: "/[role]/billing",
    roles: ["patient", "practitioner", "super_admin", "mega_admin", "inspector"],
  },
  {
    icon: User,
    label: "Profile",
    href: "/[role]/profile",
    roles: ["patient", "practitioner", "hospital_admin", "inspector", "super_admin", "mega_admin"],
  },
];
