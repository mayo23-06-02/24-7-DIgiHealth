import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import RegistrationWizard from "@/components/auth/RegistrationWizard";

// In Next.js 15, params must be awaited — it is now a Promise
const validRoles = ["patient", "practitioner", "hospital", "emt"];

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
      const { payload } = await jwtVerify(token, secret);
      if (payload && payload.role) {
        redirect(`/${payload.role}`);
      }
    } catch {
      // Invalid token, ignore
    }
  }

  const safeRole = validRoles.includes(role?.toLowerCase()) 
    ? role.toLowerCase() 
    : "patient";

  return <RegistrationWizard role={safeRole} />;
}
