import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { AuthProvider } from "@/components/auth/AuthProvider";
import DashboardShell from "@/components/shared/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  let user = null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    await connectToDatabase();
    const dbUser = await User.findById(payload.userId).lean();

    // In mega-admin case, there might not be a db entry if they are hardcoded, but assuming typical flow here:
    if (dbUser) {
      user = {
        id: dbUser._id.toString(),
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        name: `${dbUser.firstName} ${dbUser.lastName}`,
        role: dbUser.role || payload.role,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser.firstName)}+${encodeURIComponent(dbUser.lastName)}&background=4493b8&color=fff`,
      };
    } else {
      // Fallback if token exists but user isn't in DB right now
      const fName = (payload.firstName as string) || "User";
      const lName = (payload.lastName as string) || "";
      user = {
        id: payload.userId as string,
        firstName: fName,
        lastName: lName,
        name: lName ? `${fName} ${lName}` : fName,
        role: payload.role as string,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fName)}+${encodeURIComponent(lName)}&background=0052cc&color=fff`,
      };
    }
  } catch (err) {
    // Bad token or DB error
    console.error("Layout Auth Error:", err);
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthProvider user={user}>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
