"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import RightPanel from "./RightPanel";
import { useLogin } from "./useLogin";
import LeftPanel from "./LeftPanel";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const isRegistered = searchParams?.get("registered") === "true";
  const isVerified = searchParams?.get("verified") === "true";
  const prefillEmail = (searchParams?.get("email") || "").trim();
  const login = useLogin();

  return (
    <div className="flex flex-col lg:flex-row lg:min-h-[75vh] w-full max-w-6xl mx-auto rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-700">
      <LeftPanel
        isRegistered={isRegistered}
        isVerified={isVerified}
        prefillEmail={prefillEmail}
        login={login}
      />
      <RightPanel />
    </div>
  );
}
