"use client";
import React, { useState } from "react";
import { useNavigate } from "@/hooks/useNavigate";
import { BiArrowToRight, BiLoaderAlt } from "react-icons/bi";
import LogoMain from "@/components/ui/LogoMain";

export default function RegisterRoleSelection() {
  const { navigate, isPending, pendingHref } = useNavigate();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  /**
   * Patients only. The professional path was removed from this chooser because
   * practitioners and facilities are onboarded through direct contact, not
   * self-serve signup — so offering it here sent patients down a route that
   * was never meant for them. The /register/professionals route still exists
   * for anyone who is sent the link directly.
   */
  const paths = [
    {
      id: "patient",
      title: "Create your Medical Cover",
      description:
        "Book same-day consultations and manage your health records in one place.",
      icon: "👩‍⚕️",
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=2070&auto=format&fit=crop",
      route: "/register/patient",
    },
  ];

  // The auth layout already centres this, so no height is set here. From lg up
  // the card is capped at 85vh and scrolls inside itself if the content ever
  // exceeds that; on phones it grows naturally and the page scrolls, so
  // nothing is ever clipped.
  return (
    <div className="w-full max-w-4xl xl:max-w-5xl mx-auto flex items-center justify-center">
      <div className="group ring-1 ring-slate-200/5 custom-scrollbar bg-white border border-slate-200 p-6 md:p-8 pb-5 rounded-lg relative w-full lg:max-h-[85vh] lg:overflow-y-auto">
        <div className="flex max-w-5xl mx-auto items-center gap-3">
          <span className="text-secondary text-3xl">+</span>
          <span className="text-secondary tracking-normal text-sm">
            Join the Network
          </span>
        </div>

        <div className="grid grid-cols-1 max-w-5xl mx-auto lg:grid-cols-[1.1fr_0.9fr] gap-6 md:gap-16 items-start mb-8">
          <div className="lg:py-5 pt-4">
            <div className="mb-10">
              <LogoMain height={150} width={150} alt={false} />
            </div>
            <h2 className="text-xl md:text-4xl font-medium text-slate-900 leading-[1.05] tracking-tight mb-2 font-grotesk">
              The Right Path to <br />{" "}
              <span className="text-primary font-bold">Better Health</span>
            </h2>
            <p className="text-sm text-slate-500 max-w-lg">
              We simplify modern healthcare by connecting you with vetted South
              African doctors. Create your account below to get started.
            </p>
          </div>

          <div className="bg-primary hidden md:block rounded-lg p-10 flex flex-col justify-between text-white transform hover:scale-[1.02] duration-500 group">
            <h3 className="font-normal mb-4 font-grotesk">
              We're committed to delivering the highest standard of medical
              record privacy and clinical care.
            </h3>
            <div className="flex flex-wrap gap-3">
              {["24/7 Connectivity"].map((pill) => (
                <div
                  key={pill}
                  className="bg-white/10 rounded-lg text-xs font-bold border border-white/20 tracking-normal py-2 px-3"
                >
                  {pill}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 max-w-5xl mx-auto border-t border-slate-100 py-2">
          {paths.map((path) => (
            <button
              key={path.id}
              type="button"
              onMouseEnter={() => setHoveredPath(path.id)}
              onMouseLeave={() => setHoveredPath(null)}
              onClick={() => navigate(path.route)}
              disabled={isPending}
              className={`group border-b border-slate-100 flex items-center pb-2 lg:pb-4 justify-between transition-all duration-500 cursor-pointer relative bg-transparent w-full text-left outline-none ${hoveredPath === path.id ? "px-6 md:px-10 bg-slate-50/50" : ""
                }`}
            >
              {/* The "01/02" step counter went with the second path — a
                  counter reading 01/01 only raises the question of what the
                  other option was. */}
              <div className="flex items-center gap-6 lg:gap-10">
                <h3
                  className={`text-base md:text-lg transition-all duration-500 tracking-tight ${hoveredPath === path.id
                      ? "text-primary font-semibold translate-x-3"
                      : "text-slate-500 font-medium"
                    }`}
                >
                  {path.title}
                </h3>
              </div>

              <div className="flex items-center gap-8 translate-x-2 group-hover:translate-x-0 transition-transform duration-500">
                <p
                  className={`hidden lg:block text-slate-500 text-sm max-w-sm text-right transition-opacity duration-500 font-medium ${hoveredPath === path.id
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 translate-x-4"
                    }`}
                >
                  {path.description}
                </p>
                <div
                  className={`w-10 h-10 rounded-lg border border-primary text-primary flex items-center justify-center text-xl transition-all duration-500 ${hoveredPath === path.id
                      ? "bg-primary text-white scale-110"
                      : "scale-90 opacity-40 border-slate-200 text-slate-200"
                    }`}
                >
                  {pendingHref === path.route ? (
                    <BiLoaderAlt className="animate-spin" />
                  ) : (
                    <BiArrowToRight />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex max-w-5xl mx-auto flex-col text-center md:text-left md:flex-row items-center justify-between gap-10 py-5">
          <p className="text-slate-500 text-sm">
            Need support with your application?{" "}
            <a href="tel:+27115551234" className="text-primary font-bold hover:underline ml-2">
              Contact Guidance Team
            </a>
          </p>
          <button
            onClick={() => navigate("/login")}
            className="text-slate-700 flex items-center gap-6 hover:bg-slate-100 transition-all hover:scale-[1.03] active:scale-[0.98]"
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
