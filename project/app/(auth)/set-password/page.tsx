import { redirect } from "next/navigation";
import User from "@/lib/models/User";
import { findLiveToken } from "@/lib/provisioning/setPassword";
import { toId } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Old setup links (/set-password?token=...) now open the registration wizard, which collects
 * the full health profile. The token decides which wizard.
 */
export default async function SetPasswordRedirect({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const row = token ? await findLiveToken(token) : null;
  const user = row ? await User.findById(String(toId(row.userId))).select("role").lean() : null;
  const role = user?.role === "practitioner" ? "practitioner" : "patient";
  redirect(token ? `/register/${role}?setup=${encodeURIComponent(token)}` : "/register/patient");
}
