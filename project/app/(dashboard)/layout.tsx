import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { getEntitlement } from "@/lib/billing/entitlement";
import { AuthProvider } from "@/components/auth/AuthProvider";
import DashboardShell from "@/components/shared/DashboardShell";
import CallWrapper from "@/components/providers/CallWrapper";
import AppointmentAlertWrapper from "@/components/providers/AppointmentAlertWrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Postgres-first with a Mongo fallback, and correctly handles both Mongo
  // ObjectId and Postgres-uuid session identities — see lib/auth/getRequestUser.ts.
  const requestUser = await getRequestUser().catch((err) => {
    console.error("Layout Auth Error:", err);
    return null;
  });

  if (!requestUser) {
    redirect("/login");
  }

  const firstName = requestUser.firstName || "User";
  const lastName = requestUser.lastName || "";
  // Presence of this cookie means the current session is a guardian
  // impersonating a linked child (see app/api/patient/family/[memberId]/switch)
  // — the dashboard shell uses it to show the "managing X's account" banner.
  const isImpersonating = !!(await cookies()).get("guardian_token")?.value;

  /*
   * Where this account's cover comes from, resolved once per navigation so the
   * sidebar can drop the Billing entry for someone whose bill a guardian pays.
   *
   * Only asked for patients — nobody else can be a dependant, and it is a
   * database read on every dashboard render. It is presentation only: the
   * billing page 404s and the API refuses on their own, so a stale answer here
   * hides or shows a nav item, nothing more.
   */
  const coverage =
    requestUser.role === "patient"
      ? (await getEntitlement(requestUser.userId).catch(() => null))?.source
      : undefined;

  const user = {
    id: requestUser.userId,
    firstName,
    lastName,
    name: lastName ? `${firstName} ${lastName}` : firstName,
    role: requestUser.role,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=4493b8&color=fff`,
    isImpersonating,
    coverage,
  };

  return (
    <AuthProvider user={user}>
      {/* Wrap everything with CallWrapper to enable global incoming call notifications */}
      <CallWrapper>
        {/* Global pre-appointment countdown reminders (10/5/1 min before start) */}
        <AppointmentAlertWrapper>
          <DashboardShell>{children}</DashboardShell>
        </AppointmentAlertWrapper>
      </CallWrapper>
    </AuthProvider>
  );
}
