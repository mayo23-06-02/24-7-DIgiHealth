"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useNavigate } from "@/hooks/useNavigate";
import { BiArrowToRight, BiRightArrow, BiLoaderAlt } from "react-icons/bi";

export default function RegisterRoleSelection() {
  const { navigate, isPending, pendingHref } = useNavigate();
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  const roles = [
    {
      id: "patient",
      title: "Medical Cover Application",
      badge: "01/03",
      description:
        "Get Started, access AI telemedicine, and manage your health records in South Africa.",
      icon: "👩‍⚕️",
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "practitioner",
      title: "Medical Professional",
      badge: "02/03",
      description:
        "Manage your practice, access AI diagnostic tools, and provide care via our secure telehealth bridge.",
      icon: "🩺",
      image:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "hospital",
      title: "Healthcare Facility",
      badge: "03/03",
      description:
        "Register your hospital or clinic for B2B portal access and facility management.",
      icon: "🏥",
      image:
        "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?q=80&w=2070&auto=format&fit=crop",
    },
  ];

  return (
    <div className="w-full max-w-[1300px]   lg:py-30 lg:px-10">
      <div className="group  ring-1 ring-slate-200/5 overflow-y-auto custom-scrollbar max-h-[95vh] bg-white border border-slate-200 p-6 md:p-12 pb-5 rounded-lg relative overflow-hidden">
        <div className="flex max-w-5xl mx-auto items-center gap-3 lg:mb-10">
          <span className="text-secondary  text-3xl">+</span>
          <span className="text-secondary  tracking-normal  text-sm">
            Join the Network
          </span>
        </div>

        <div className="grid grid-cols-1 max-w-5xl mx-auto lg:grid-cols-[1.1fr_0.9fr] gap-6 md:gap-16 items-start mb-16">
          <div className="lg:py-5 pt-4">
            <h2 className="text-3xl md:text-4xl font-medium text-slate-900 leading-[1.05] tracking-tight mb-2 md:mb-10 font-grotesk">
              The Right Path to <br />{" "}
              <span className="text-primary font-bold">Better Health</span>
            </h2>
            <p className="text-sm text-slate-500 max-w-lg">
              We simplify modern healthcare by connecting you with top medical
              professionals. Select your profile below.
            </p>
          </div>

          <div className="bg-primary rounded-lg p-10 flex flex-col justify-between text-white transform hover:scale-[1.02] duration-500 group">
            <h3 className=" font-normal  mb-4 lg:mb-10 font-grotesk">
              We're committed to delivering the highest standard of medical
              record privacy and triage accuracy.
            </h3>
            <div className="flex flex-wrap gap-3">
              {["24/7 Connectivity"].map((pill) => (
                <div
                  key={pill}
                  className="bg-white/10 rounded-lg text-xs font-bold border border-white/20  tracking-normal py-2 px-3"
                >
                  {pill}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 max-w-5xl mx-auto  border-t border-slate-100 py-5">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onMouseEnter={() => setHoveredRole(role.id)}
              onMouseLeave={() => setHoveredRole(null)}
              onClick={() => navigate(`/register/`)}
              disabled={isPending}
              className={`group  border-b border-slate-100 flex items-center pb-4 justify-between transition-all duration-500 cursor-pointer relative bg-transparent w-full text-left outline-none ${
                hoveredRole === role.id ? "px-6 md:px-10 bg-slate-50/50" : ""
              }`}
            >
              <div className="flex items-center gap-10">
                <span
                  className={`text-lg  transition-all duration-500 ${
                    hoveredRole === role.id
                      ? "text-primary scale-125"
                      : "text-slate-200"
                  }`}
                >
                  {role.badge}
                </span>
                <h3
                  className={`text-xl md:text-2xl transition-all duration-500 tracking-tight ${
                    hoveredRole === role.id
                      ? "text-primary font-semibold translate-x-3"
                      : "text-slate-500 font-medium"
                  }`}
                >
                  {role.title}
                </h3>
              </div>

              <div className="flex items-center gap-8 translate-x-2 group-hover:translate-x-0 transition-transform duration-500">
                <p
                  className={`hidden lg:block text-slate-500 text-sm max-w-sm text-right transition-opacity duration-500 font-medium ${
                    hoveredRole === role.id
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 translate-x-4"
                  }`}
                >
                  {role.description}
                </p>
                <div
                  className={`w-10 h-10 rounded-lg border border-primary text-primary flex items-center justify-center text-xl transition-all duration-500 ${
                    hoveredRole === role.id
                      ? "bg-primary text-white scale-110 "
                      : "scale-90 opacity-40 border-slate-200 text-slate-200"
                  }`}
                >
                  {pendingHref === `/register/` ? (
                    <BiLoaderAlt className="animate-spin" />
                  ) : (
                    <BiArrowToRight />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-20 flex max-w-5xl mx-auto flex-col border-t border-slate-100 md:flex-row items-center justify-between gap-10 py-5">
          <p className="text-slate-500  text-sm">
            Need support with your application?{" "}
            <button className="text-primary font-bold hover:underline ml-2">
              Contact Guidance Team
            </button>
          </p>
          <button
            onClick={() => navigate("/login")}
            className=" text-slate-700    flex items-center gap-6    hover:bg-slate-100 transition-all hover:scale-[1.03] active:scale-[0.98]"
          >
            Already Registered? <span className="font-bold">Login</span>
          </button>
        </div>

        <style jsx>{`
          @keyframes popIn {
            0% {
              opacity: 0;
              transform: translateY(-50%) rotate(-10deg) scale(0.8)
                translateX(-20px);
            }
            100% {
              opacity: 1;
              transform: translateY(-50%) rotate(5deg) scale(1) translateX(0);
            }
          }
          .animate-popIn {
            animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)
              forwards;
          }
        `}</style>
      </div>
    </div>
  );
}
