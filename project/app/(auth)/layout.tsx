import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen relative flex flex-col justify-center items-center py-16 px-4 sm:px-10 xl:px-16 2xl:px-24 overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed bg-[url('/auth-wizard.jpg')]">
      {/* Dynamic Overlay for depth */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-0"></div>
      <div className="absolute inset-0 bg-linear-to-tr from-slate-900/60 via-transparent to-primary/10 z-0 h-screen"></div>

      <div className="relative z-10 w-full max-w-350  mx-auto ">
        <div className="mb-[20px] text-center flex justify-center items-center"></div>
        {children}
      </div>

      <div className="relative z-10 text-center mt-20"></div>
    </div>
  );
}
