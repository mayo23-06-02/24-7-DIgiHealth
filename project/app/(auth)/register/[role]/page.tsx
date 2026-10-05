import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import RegistrationWizard from "@/components/auth/Register/RegistrationWizard";
import FileNumberRegistration from "@/components/auth/Register/FileNumberRegistration";
import DoctorNotice from "@/components/auth/Register/DoctorNotice";

const validRoles = ["patient", "practitioner", "hospital"];

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
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
  if (safeRole === "patient") return <FileNumberRegistration />;
  if (safeRole === "practitioner") return <DoctorNotice />;
  return <RegistrationWizard role={safeRole} />;
}
