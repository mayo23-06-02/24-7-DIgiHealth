"use client";
import React, { useState } from "react";

export default function WhyChooseUs() {
  const [activeWhyTab, setActiveWhyTab] = useState("Collaboration");

  return (
    <section
      id="why-choose-us"
      className="section bg-slate-100 text-slate-900 py-32"
    >
      <div className="container mx-auto px-6 sm:px-10 xl:px-16 2xl:px-24 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
        <div className="flex flex-col gap-4 mb-20">
          <div className="flex items-center gap-3">
            <span className="text-secondary font-bold text-3xl">+</span>
            <span className="text-secondary font-bold tracking-normal  text-sm">
              Why Choose Us
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-12 items-end py-15">
            <h2 className="text-4xl md:text-5xl font-medium text-slate-900 leading-[1.05] tracking-tight font-grotesk">
              A Simplified Path to <br />{" "}
              <span className="text-primary font-bold">
                24/7 Digital Healthcare
              </span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed pb-2">
              Providing patient-centered care through expert guidance,
              innovative AI triage, and personalized support across all nine
              provinces.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 h-auto lg:h-[600px]">
          {/* Left Column - Values List */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex justify-between text-primary font-semibold text-sm mb-8 border-b border-slate-200 pb-4">
                <span>Values List</span>
                <span>01/05</span>
              </div>
              <div className="flex flex-col gap-6">
                {[
                  "Compassion",
                  "Collaboration",
                  "Transparency",
                  "Flexibility",
                  "Excellence",
                ].map((val) => (
                  <div
                    key={val}
                    onMouseEnter={() => setActiveWhyTab(val)}
                    className={`py-4 md:py-[1.2rem] border-b border-slate-200 text-2xl md:text-[1.8rem] transition-all duration-300 relative cursor-pointer ${activeWhyTab === val ? "font-medium text-primary" : "font-normal text-slate-500"}`}
                  >
                    {val}
                  </div>
                ))}
              </div>
            </div>

            <button className="self-start mt-8 lg:mt-0 bg-primary text-white py-2 pr-2 pl-6 rounded-lg flex items-center gap-4 font-medium border-none cursor-pointer text-base transition-transform duration-200 hover:scale-105">
              Get Started
              <div className="w-8 h-8 bg-white text-primary rounded-lg grid place-items-center text-xl font-bold">
                →
              </div>
            </button>
          </div>
          <div />
          {/* Middle Column - Large Image */}
          <div className="rounded-lg overflow-hidden h-[400px] lg:h-full">
            <img
              src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?q=80&w=2091&auto=format&fit=crop"
              alt="Doctor with patient"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right Column - Blue Box */}
          <div className="bg-primary rounded-lg p-12 flex flex-col justify-between text-white p-5">
            <h3 className="text-xl md:text-2xl font-normal  tracking-tight font-grotesk">
              We're committed to delivering the highest standard of medical care
              with sensitivity.
            </h3>

            <div className="flex flex-wrap gap-3 mt-8 lg:mt-0">
              {[
                "Compassion",
                "Collaboration",
                "Excellence",
                "Transparency",
                "Flexibility",
              ].map((pill) => (
                <div
                  key={pill}
                  className="py-3 px-6 bg-white/15 rounded-lg text-[0.95rem] font-normal border border-white/10 p-5"
                >
                  {pill}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: translateY(-50%) rotate(0deg) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(-50%) rotate(5deg) scale(1);
          }
        }
        .animate-popIn {
          animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </section>
  );
}
