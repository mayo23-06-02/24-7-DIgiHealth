"use client";

import React, { useState } from "react";

const stats = [
  {
    value: "50+",
    label: "Healthcare Professionals Supporting Lives Across South Africa",
  },
  { value: "135k+", label: "Patients Registered for Virtual Consultations" },
  { value: "97%", label: "Consultation Success Rate & Patient Satisfaction" },
  { value: "24/7", label: "Continuous Access to Remote Medical Care" },
];

export default function AboutUs() {
  const [currentStat, setCurrentStat] = useState(0);

  const nextStat = () => setCurrentStat((prev) => (prev + 1) % stats.length);
  const prevStat = () =>
    setCurrentStat((prev) => (prev === 0 ? stats.length - 1 : prev - 1));

  return (
    <section
      id="about"
      className="section bg-white h-[90vh] text-slate-900 py-32 relative overflow-hidden"
    >
      {/* Decorative Background Placeholder (DNA-like) */}
      <div
        className="absolute inset-y-0 left-[10%] w-1/2 bg-cover opacity-10 z-0 bg-[url('data:image/svg+xml;utf8,<svg%20viewBox=%220%200%20100%20100%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ccircle%20cx=%2250%22%20cy=%2250%22%20r=%2240%22%20stroke=%22%23e2e8f0%22%20stroke-dasharray=%222%204%22%20stroke-width=%221%22%20fill=%22none%22/%3E%3C/svg%3E')]"
      ></div>

      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px] relative z-10">
        <div className="grid grid-cols-5 md:grid-cols-5 lg:grid-cols-5 gap-12 items-center">
          {/* Left Column */}
          <div className="flex flex-col col-span-2 justify-between h-full gap-8">
            <div className="flex items-center gap-2">
              <span className="text-secondary font-extrabold text-xl">+</span>
              <span className="text-secondary font-semibold tracking-widest uppercase text-sm">
                About Us
              </span>
            </div>

            <div className="">
              <div
                className="flex items-center gap-4 mt-4 mb-5"
              >
                <div className="px-6 py-2 bg-slate-100 rounded-lg text-sm font-semibold text-slate-800">
                  Our Impact
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={prevStat}
                    className="w-9 h-9 rounded-lg border border-primary text-primary bg-transparent flex items-center justify-center cursor-pointer transition-all hover:bg-primary/5 hover:scale-105 active:scale-95"
                  >
                    ←
                  </button>
                  <button
                    onClick={nextStat}
                    className="w-9 h-9 rounded-lg border-none text-white bg-primary flex items-center justify-center cursor-pointer transition-all hover:brightness-110 hover:scale-105 active:scale-95"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="mt-4 min-h-[160px] relative">
                <div
                  key={currentStat}
                  className="animate-in fade-in slide-in-from-left-4 duration-500 absolute top-0 left-0"
                >
                  <div className="text-7xl font-bold text-primary leading-none">
                    {stats[currentStat].value}
                  </div>
                  <p className="text-slate-600 mt-4 max-w-[220px] leading-relaxed text-base font-medium">
                    {stats[currentStat].label}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Image */}
          <div className="relative col-span-3 flex-col   w-full h-[60vh]  flex justify-between bgb items-start">
            <div className="flex">
              <div
                className="w-full max-w-[320px] h-[200px]  rounded-lg overflow-hidden pr-5"
              >
                <img
                  src="/LandingPage/bg-2.jpg"
                  alt="Doctor"
                  className="w-full h-full rounded-lg object-cover"
                />
              </div>
              <h2 className="text-lg md:text-2xl font-normal text-slate-600 ">
                <span className="font-bold text-primary">24/7 DigiHealth</span>{" "}
                connects doctors and patients effortlessly, providing smarter,
                safer, and compassionate healthcare from diagnosis to full
                recovery.
              </h2>
            </div>
            <div className="flex  gap-8">
              <div className="flex gap-8">
                {/* Card 1 */}
                <div
                  className="bg-linear-to-b from-sky-50 to-sky-100  rounded-lg p-10"
                >
                  <div
                    className="flex justify-between items-center mb-5"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center ">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="var(--primary)"
                        stroke="var(--primary)"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 12.68l7.03 6.84a1.86 1.86 0 0 0 2.54 0l7.03-6.84c2.67-2.4 2.54-5.98-.18-8.1z"></path>
                      </svg>
                    </div>
                    <div
                      className="bg-white px-5 py-1.25 rounded-lg text-sm font-semibold text-primary "
                    >
                      Connected Care
                    </div>
                  </div>
                  <h4
                    className="text-xl font-semibold text-primary mb-3.75"
                  >
                    Smart Care
                  </h4>
                  <div className="p- rounded-lg text-[0.95rem] text-primary leading-relaxed ">
                    Smart digital health tracking ensures accurate insights and
                    better outcomes for all users.
                  </div>
                </div>

                {/* Card 2 */}
                <div
                  className="bg-linear-to-b from-sky-50 to-sky-100  rounded-lg p-10"
                >
                  <div
                    className="flex justify-between items-center mb-5"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center ">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="var(--primary)"
                        stroke="var(--primary)"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                    </div>
                    <div
                      className="bg-white px-5 py-1.25 rounded-lg text-sm font-semibold text-primary "
                    >
                      Connected Care
                    </div>
                  </div>
                  <h4
                    className="text-xl font-semibold text-primary mb-3.75"
                  >
                    Secure Data
                  </h4>
                  <div className="p- rounded-lg text-[0.95rem] text-primary leading-relaxed ">
                    Protecting patient data through secure, POPIA-compliant
                    digital health systems directly within SA borders.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
