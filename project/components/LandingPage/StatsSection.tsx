import React from "react";

export default function StatsSection() {
  return (
    <section id="market" className="section bg-[#020617] text-white">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-16 text-center">
          <div>
            <div className="text-[3.5rem] font-extrabold text-accent">$4.36B</div>
            <p className="opacity-80 text-[1.1rem]">SA Market Value (2030)</p>
          </div>
          <div>
            <div className="text-[3.5rem] font-extrabold text-accent">27.5%</div>
            <p className="opacity-80 text-[1.1rem]">Growth Rate (CAGR)</p>
          </div>
          <div>
            <div className="text-[3.5rem] font-extrabold text-accent">43M+</div>
            <p className="opacity-80 text-[1.1rem]">RSA Internet Users</p>
          </div>
          <div>
            <div className="text-[3.5rem] font-extrabold text-accent">11</div>
            <p className="opacity-80 text-[1.1rem]">Official Languages</p>
          </div>
        </div>
      </div>
    </section>
  );
}
