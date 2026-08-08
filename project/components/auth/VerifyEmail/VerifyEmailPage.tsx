"use client";

import { Suspense } from "react";
import VerifyEmailForm from "./VerifyEmailForm";

function RightPanel() {
  return (
    <div className="hidden lg:flex flex-1 bg-primary/95 text-white p-10 flex-col justify-center rounded-r-lg">
      <p className="text-xs font-bold tracking-widest text-white/70 mb-3">
        ALMOST THERE
      </p>
      <h3 className="text-3xl font-bold font-grotesk leading-tight mb-4">
        Confirm your inbox to activate DigiHealth
      </h3>
      <p className="text-white/80 text-sm leading-relaxed max-w-md">
        We email a 6-digit code to confirm your address. Enter it here and
        you're signed in immediately — no separate login step needed.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 w-full max-w-lg bg-white/80 rounded-lg animate-pulse" />
      }
    >
      <div className="flex flex-col lg:flex-row lg:min-h-[70vh] w-full max-w-6xl mx-auto rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-700">
        <VerifyEmailForm />
        <RightPanel />
      </div>
    </Suspense>
  );
}
