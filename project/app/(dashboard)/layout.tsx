import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getRequestUser } from "@/lib/auth/getRequestUser";
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
  const user = {
    id: requestUser.userId,
    firstName,
    lastName,
    name: lastName ? `${firstName} ${lastName}` : firstName,
    role: requestUser.role,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=4493b8&color=fff`,
    isImpersonating,
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
