"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BiArrowToRight, BiRightArrow } from "react-icons/bi";

export default function RegisterRoleSelection() {
  const router = useRouter();
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  const roles = [
    {
      id: "patient",
      title: "Patient Account",
      badge: "01/04",
      description:
        "Get Started, access AI telemedicine, and manage your health records in South Africa.",
      icon: "👩‍⚕️",
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "practitioner",
      title: "Medical Professional",
      badge: "02/04",
      description:
        "Manage your practice, access AI diagnostic tools, and provide care via our secure telehealth bridge.",
      icon: "🩺",
      image:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "hospital",
      title: "Healthcare Facility",
      badge: "03/04",
      description:
        "Register your hospital or clinic for B2B portal access, dispatch networks, and facility management.",
      icon: "🏥",
      image:
        "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "emt",
      title: "First Responder (EMT)",
      badge: "04/04",
      description:
        "Emergency Medical Technicians and first responders. Access real-time dispatch and patient triage.",
      icon: "🚑",
      image:
        "https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=2070&auto=format&fit=crop",
    },
  ];

  return (
    <div className="w-full max-w-[1300px] py-30 px-10">
      <div className="group ring-1 ring-slate-200/5 bg-white border border-slate-200 p-12 pb-5 rounded-lg relative overflow-hidden">
        <div className="flex items-center gap-3 mb-10">
          <span className="text-secondary font-black text-3xl">+</span>
          <span className="text-secondary font-bold tracking-widest uppercase text-sm">
            Join the Network
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-16 items-start mb-16">
          <div className="py-5">
            <h2 className="text-3xl md:text-4xl font-medium text-slate-900 leading-[1.05] tracking-tight mb-2.5 mb-10">
              The Right Path to <br />{" "}
              <span className="text-primary font-black">Better Health</span>
            </h2>
            <p className="text-sm text-slate-500 max-w-lg">
              We simplify modern healthcare by connecting you with top medical
              professionals. Select your profile below.
            </p>
          </div>

          <div className="bg-primary rounded-lg p-10 flex flex-col justify-between text-white transform hover:scale-[1.02] duration-500 group">
            <h3 className=" font-normal  mb-2.5 mb-10">
              We're committed to delivering the highest standard of medical
              record privacy and triage accuracy.
            </h3>
            <div className="flex flex-wrap gap-3">
              {["24/7 Connectivity"].map((pill) => (
                <div
                  key={pill}
                  className="bg-white/10 rounded-lg text-[10px] font-bold border border-white/20 uppercase tracking-widest py-1.25 px-2.5"
                >
                  {pill}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4  border-t border-slate-100 py-5">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onMouseEnter={() => setHoveredRole(role.id)}
              onMouseLeave={() => setHoveredRole(null)}
              onClick={() => router.push(`/register/${role.id}`)}
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
                      : "text-slate-400 font-medium"
                  }`}
                >
                  {role.title}
                </h3>
              </div>

              <div className="flex items-center gap-8 translate-x-2 group-hover:translate-x-0 transition-transform duration-500">
                <p
                  className={`hidden lg:block text-slate-400 text-sm max-w-sm text-right transition-opacity duration-500 font-medium ${
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
                  <BiArrowToRight />
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-20 flex flex-col border-t border-slate-100 md:flex-row items-center justify-between gap-10 py-5">
          <p className="text-slate-400  text-sm">
            Need support with your application?{" "}
            <button className="text-primary font-bold hover:underline ml-2">
              Contact Guidance Team
            </button>
          </p>
          <button
            onClick={() => router.push("/login")}
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
