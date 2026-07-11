"use client";

import { useAuthContext } from "@/components/auth/AuthProvider";
import AdminOverviewPage from "./AdminOverviewPage";
import AdminUsersPage from "./AdminUsersPage";
import AdminFacilitiesPage from "./AdminFacilitiesPage";
import AdminFinancePage from "./AdminFinancePage";
import AdminAnalyticsPage from "./AdminAnalyticsPage";
import AdminReportsPage from "./AdminReportsPage";
import AdminAlertsPage from "./AdminAlertsPage";
import AdminAuditPage from "./AdminAuditPage";
import AdminSettingsPage from "./AdminSettingsPage";

function useAdminRole() {
  const { user } = useAuthContext();
  const role = (user as any)?.role || "super_admin";
  return {
    rolePrefix: role,
    actorRole: role,
    isMega: role === "mega_admin",
  };
}

export function AdminHome() {
  const { rolePrefix } = useAdminRole();
  return <AdminOverviewPage rolePrefix={rolePrefix} />;
}

export function AdminUsers() {
  const { rolePrefix, actorRole } = useAdminRole();
  return <AdminUsersPage rolePrefix={rolePrefix} actorRole={actorRole} />;
}

export function AdminFacilities() {
  return <AdminFacilitiesPage />;
}

export function AdminFinance() {
  return <AdminFinancePage />;
}

export function AdminAnalytics() {
  return <AdminAnalyticsPage />;
}

export function AdminReports() {
  return <AdminReportsPage />;
}

export function AdminAlerts() {
  return <AdminAlertsPage />;
}

export function AdminAudit() {
  return <AdminAuditPage />;
}

export function AdminSettings() {
  const { isMega } = useAdminRole();
  return <AdminSettingsPage isMega={isMega} />;
}
