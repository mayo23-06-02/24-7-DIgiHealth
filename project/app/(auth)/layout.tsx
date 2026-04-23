import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen relative flex flex-col justify-center items-center py-16 px-6 sm:px-10 xl:px-16 2xl:px-24 overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed bg-[url('/auth-wizard.jpg')]">
      {/* Dynamic Overlay for depth */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-0"></div>
      <div className="absolute inset-0 bg-linear-to-tr from-slate-900/60 via-transparent to-primary/10 z-0"></div>

      <div className="relative z-10 w-full max-w-6xl  mx-auto ">
        <div className="mb-[20px] text-center flex justify-center items-center"></div>
        {children}
      </div>

      <div className="relative z-10 text-center mt-20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-px w-12 bg-white/20"></div>
          <p className="text-white/40 text-xs tracking-wider">
            © {new Date().getFullYear()} 24/7 TELEHEALTH SOUTH AFRICA
          </p>
        </div>
      </div>
    </div>
  );
}
