"use client";
import React from "react";

export default function Approach() {
  return (
    <section
      id="approach"
      className="section bg-[#F8FAFC] text-slate-900 py-32 text-center"
    >
      <div className="container flex items-center flex-col mx-auto px-6 sm:px-10 xl:px-16 2xl:px-24 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
        <div className="flex justify-center items-center gap-3 mb-6">
          <span className="text-secondary text-3xl font-bold">✦</span>
          <span className="text-secondary font-bold tracking-normal  text-sm">
            Approach
          </span>
        </div>

        <h2 className="text-4xl md:text-4xl font-medium text-slate-900 mb-8 tracking-tight font-grotesk">
          The{" "}
          <span className="text-primary font-bold">
            24/7 DigiHealth Total Care™
          </span>{" "}
          Model
        </h2>

        <p className="text-lg text-slate-500 max-w-2xl mx-auto  mb-16 p-5">
          Providing patient-centered care through expert guidance, innovative
          solutions, and personalized support every step of the way.
        </p>

        <div className="relative bg-slate-200 rounded-lg overflow-hidden w-full max-w-6xl mx-auto h-[450px] md:h-[600px]  ring-1 ring-slate-200/50">
          {/* Background Image */}

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex justify-center items-center z-10">
            <button className="w-20 h-20 rounded-lg bg-white/20 border-2 border-primary flex place-items-center justify-center backdrop-blur-sm cursor-pointer transition-transform hover:scale-110">
              <div className="w-0 h-0 border-y-12 border-y-transparent border-l-20 border-l-primary ml-2"></div>
            </button>
          </div>

          {/* Gradient Bottom Overlay */}
          <div className="absolute w-full flex justify-center items-center inset-x-0 bottom-0 bg-linear-to-t from-[#10689e]/95 via-[#10689e]/60 to-transparent pt-32 pb-8 px-8 md:px-12 text-left z-0">
            <p className="text-white text-md text-center font-normal max-w-3xl p-5">
              Our 24/7 DigiHealth™ model unites doctors, specialists, and
              wellness experts in one place. From diagnostics to recovery, we
              ensure holistic healing and long-term wellness.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
