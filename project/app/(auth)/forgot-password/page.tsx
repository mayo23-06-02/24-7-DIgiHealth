import React, { Suspense } from "react";
import ForgotPasswordForm from "@/components/auth/ForgotPassword/ForgotPasswordForm";

export const metadata = {
  title: "Reset Password | 24/7 DigiHealth",
};

export default function ForgotPasswordRoute() {
  return (
    // The form reads ?token= via useSearchParams, which Next requires to sit
    // inside a Suspense boundary. Without one the whole route silently drops
    // to client-only rendering and the form is absent from the served HTML.
    <Suspense
      fallback={
        <div className="bg-white rounded-lg w-full max-w-lg mx-auto p-6 md:p-10 py-12 min-h-[420px] animate-pulse" />
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
