import React from "react";
import LogoMain from "@/components/ui/LogoMain";

export default function RightPanel() {
  return (
    <div className="hidden lg:block w-3/5 relative p-5">
      <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] p-5" />
      <div className="absolute inset-0 bg-linear-to-tr from-primary/80 via-primary/40 to-transparent" />

      <div className="absolute inset-x-0 bottom-16 px-16 text-white space-y-6 p-10">
        <LogoMain width={300} height={300} alt={true} />

        <div className="w-16 h-px bg-white/40 mb-5" />
        <h3 className="text-4xl lg:text-5xl font-bold tracking-tighter font-grotesk">
          Smart Healthcare <br /> for a Digital World
        </h3>
        <p className="text-white/80 font-light leading-relaxed max-w-md mb-2.5">
          Connecting patients with medical experts across South Africa.
          Professional, immediate, and accessible care 24/7.
        </p>
        <div className="flex items-center gap-6 mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col">
            <span className="text-2xl">9 Provinces</span>
            <span className="text-xs tracking-normal opacity-60">
              Country Coverage
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
