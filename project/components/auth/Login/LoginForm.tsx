"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import RightPanel from "./RightPanel";
import { useLogin } from "./useLogin";
import LeftPanel from "./LeftPanel";
import LogoMain from "@/components/ui/LogoMain";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const isRegistered = searchParams?.get("registered") === "true";
  const isVerified = searchParams?.get("verified") === "true";
  const isReset = searchParams?.get("reset") === "true";
  const prefillEmail = (searchParams?.get("email") || "").trim();
  const login = useLogin();

  return (
    <div className="flex flex-col lg:flex-row lg:min-h-[70vh] w-full max-w-5xl mx-auto rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-700">
      <div className="flex lg:hidden mb-6 items-center justify-center p-4">
        <LogoMain width={200} height={100} alt={true} />
      </div>
      <LeftPanel
        isRegistered={isRegistered}
        isVerified={isVerified}
        isReset={isReset}
        prefillEmail={prefillEmail}
        login={login}
      />
      <RightPanel />
    </div>
  );
}
