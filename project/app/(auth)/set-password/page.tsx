import React, { Suspense } from "react";
import SetPasswordForm from "@/components/auth/SetPassword/SetPasswordForm";

export const metadata = { title: "Set Password | 24/7 DigiHealth" };

export default function SetPasswordRoute() {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[420px] w-full max-w-lg animate-pulse rounded-lg bg-white" />}>
      <SetPasswordForm />
    </Suspense>
  );
}
