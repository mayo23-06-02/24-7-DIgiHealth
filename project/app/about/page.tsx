"use client";
import React from "react";
import Navbar from "@/components/LandingPage/Navbar";
import Footer from "@/components/LandingPage/Footer";
import {
  FaUserMd,
  FaShieldAlt,
  FaLanguage,
  FaHandHoldingHeart,
} from "react-icons/fa";
import { HiOutlineLightningBolt, HiOutlineChartBar } from "react-icons/hi";
import { FiArrowRight, FiCheck, FiTarget, FiEye } from "react-icons/fi";
import { Ri24HoursFill } from "react-icons/ri";
import { BsRobot } from "react-icons/bs";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fafcff] font-sans text-slate-900 selection:bg-[#36b1d4]/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] rounded-full bg-[#36b1d4] opacity-[0.04] blur-[80px]"></div>
          <div className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[#005A9C] opacity-[0.03] blur-[100px]"></div>

          <img
            src="https://images.unsplash.com/photo-1576091160550-2173ff9e5ee5?q=80&w=2070&auto=format&fit=crop"
            alt="Diverse South African Healthcare"
            className="w-full h-full object-cover opacity-[0.02]"
          />
          <div className="absolute inset-0 bg-linear-to-b from-white/40 via-transparent to-white"></div>
        </div>

        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px] relative z-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <div className="lg:w-1/2 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#005A9C]/5 text-[#005A9C] font-semibold text-sm tracking-normal  mb-8 border border-[#005A9C]/10">
              <span className="w-2 h-2 rounded-lg bg-[#36b1d4] animate-pulse"></span>
              Our Identity
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-8 tracking-tight font-grotesk">
              We Are Here to Make Healthcare Work for{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#005A9C] to-[#36b1d4]">
                Every South African.
              </span>
            </h1>
            <p className="text-lg md:text-[1.3rem] text-slate-600 mb-12 leading-relaxed max-w-2xl font-medium">
              Founded on the principle of Ubuntu, we are a proudly South African
              health-tech company bridging the gap between you and quality
              healthcare, anytime, anywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
              <button className="group px-8 py-4 bg-[#005A9C] text-white rounded-lg font-semibold outline-none hover:bg-[#00487c] hover:scale-105 transition-all flex items-center justify-center gap-3 text-lg">
                Book a Free Consultation
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-white text-slate-700 hover:text-[#005A9C] border-2 border-slate-200 hover:border-[#005A9C]/50 rounded-lg font-semibold outline-none transition-all flex items-center justify-center text-lg">
                Learn More About Our Mission
              </button>
            </div>
          </div>

          <div className="lg:w-1/2 relative w-full h-[500px] md:h-[650px] rounded-lg overflow-hidden group border-[8px] border-white backdrop-blur-sm">
            <div className="absolute inset-0 z-10 bg-linear-to-tr from-[#005A9C]/40 via-transparent to-transparent mix-blend-multiply transition-opacity duration-700 group-hover:opacity-60"></div>
            <img
              src="https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=2070&auto=format&fit=crop"
              alt="Healthcare connection"
              className="w-full h-full object-cover transition-transform duration-[20s] ease-out group-hover:scale-110"
            />

            {/* Floating Info Card */}
            <div className="absolute top-10 -left-6 md:left-10 z-30 bg-white/95 backdrop-blur-md p-4 pr-6 rounded-lg border border-white flex items-center gap-4 animate-[bounce_4s_infinite]">
              <div className="w-12 h-12 rounded-lg bg-[#e8f5f9] flex items-center justify-center text-[#36b1d4] text-xl">
                <FaUserMd />
              </div>
              <div>
                <p className="font-bold text-slate-800 leading-tight">
                  800k+ Patients
                </p>
                <p className="text-sm text-slate-500 font-medium">
                  Treated successfully
                </p>
              </div>
            </div>

            <div className="absolute bottom-8 left-8 right-8 p-8 rounded-lg bg-white/10 backdrop-blur-xl border border-white/30 z-20 transition-transform duration-500 group-hover:-translate-y-2">
              <p className="text-white font-medium text-2xl italic leading-snug">
                "I am because we are." <br />
                <span className="text-[0.85rem] font-bold opacity-100 not-italic mt-4 inline-flex items-center gap-2  tracking-normal text-[#005A9C] bg-white px-4 py-2 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-lg bg-[#36b1d4]"></span>
                  The spirit of Ubuntu
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Our Story */}
      <section className="py-24 md:py-32 bg-[#fafcff] relative">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
          <div className="max-w-4xl mx-auto text-center mb-20 md:mb-24">
            <span className="text-[#36b1d4] font-bold text-2xl mb-4 block animate-bounce">
              ✦
            </span>
            <h2 className="text-4xl md:text-[3.5rem] font-bold text-slate-900 mb-6 tracking-tight font-grotesk">
              Our Story & Why We Exist
            </h2>
            <div className="w-24 h-1.5 bg-linear-to-r from-[#005A9C] to-[#36b1d4] mx-auto rounded-full"></div>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 lg:gap-20 items-center">
            <div className="space-y-8">
              <p className="text-2xl md:text-3xl font-medium text-slate-800 leading-tight">
                The inspiration for 24/7 TeleHealth came from a simple, urgent
                question: <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-[#005A9C] to-[#36b1d4] block mt-4">
                  Why is quality healthcare not accessible to everyone in South
                  Africa?
                </span>
              </p>
              <div className="h-px w-full bg-slate-200"></div>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                Our founders, a team of South African doctors, tech
                entrepreneurs, and public health experts, saw firsthand the long
                queues, the hours of travel, and the crushing uncertainty faced
                by millions trying to access care.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                We recognized a deep divide: while only about 16% of South
                Africans have access to private healthcare facilities, a
                staggering 84% rely on a public system that is overburdened and
                under-resourced. This inequality creates "two separate nations"
                within our healthcare system.{" "}
                <strong className="text-[#005A9C]">
                  We set out to build a bridge.
                </strong>
              </p>
            </div>

            <div className="relative">
              {/* Decorative background blob */}
              <div className="absolute inset-0 bg-linear-to-br from-[#36b1d4]/20 to-[#005A9C]/20 blur-3xl transform rotate-12 scale-110 rounded-full z-0"></div>

              <div className="space-y-8 p-10 md:p-14 bg-white/80 backdrop-blur-lg rounded-lg border border-white relative z-10 hover:-translate-y-2 transition-transform duration-500">
                <div className="absolute -top-10 -left-6 text-[10rem] text-[#36b1d4]/10 font-serif leading-none h-20 overflow-visible z-0 pointer-events-none">
                  "
                </div>

                <p className="text-2xl md:text-[1.7rem] font-medium text-[#005A9C] leading-snug relative z-10 pt-4 text-center md:text-left">
                  Our solution is not just technology; it's a commitment to the
                  philosophy of Ubuntu—the belief that a person is a person
                  through other people, and that "I am because we are".
                </p>

                <div className="h-1 w-20 bg-linear-to-r from-[#005A9C] to-transparent my-8 mx-auto md:mx-0"></div>

                <p className="font-bold text-slate-800 text-xl md:text-2xl relative z-10 text-center md:text-left">
                  We believe that no one should have to choose between paying
                  rent and seeing a doctor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Mission & Vision */}
      <section className="py-32 bg-[#002f54] text-white relative overflow-hidden">
        {/* Abstract Topographic or Net Background */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%221%22%3E%3Cpath%20d=%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[#36b1d4]/50 to-transparent"></div>
        <div className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[#36b1d4]/50 to-transparent"></div>

        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px] relative z-10">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            {/* Mission Card */}
            <div className="group bg-white/5 backdrop-blur-xl border border-white/10 p-10 md:p-14 rounded-lg hover:bg-white/10 transition-all duration-500">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 rounded-lg bg-[#36b1d4]/20 border border-[#36b1d4]/30 flex items-center justify-center text-[#36b1d4] text-3xl group-hover:scale-110 group-hover:bg-[#36b1d4] group-hover:text-white transition-all">
                  <FiTarget />
                </div>
                <h3 className="text-4xl font-bold font-grotesk">Our Mission</h3>
              </div>
              <p className="text-xl md:text-[1.35rem] leading-relaxed text-white/80 font-light">
                To democratize healthcare in South Africa by providing every
                citizen with a{" "}
                <strong className="text-white font-semibold">
                  "Digital Front Door"
                </strong>{" "}
                to affordable, high-quality, and culturally competent medical
                care, 24 hours a day, 7 days a week.
              </p>
            </div>

            {/* Vision Card */}
            <div className="group bg-linear-to-br from-[#005A9C] to-[#00487c] p-10 md:p-14 rounded-lg hover:-translate-y-2 transition-transform duration-500 border border-[#005A9C]/50">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white text-3xl group-hover:scale-110 group-hover:bg-white group-hover:text-[#005A9C] transition-all">
                  <FiEye />
                </div>
                <h3 className="text-4xl font-bold font-grotesk">Our Vision</h3>
              </div>
              <p className="text-xl md:text-[1.35rem] leading-relaxed text-white/90 font-light">
                A South Africa where the first step to better health is not a
                long journey, but a{" "}
                <strong className="text-white font-semibold">
                  simple tap on a screen.
                </strong>{" "}
                We envision a future where distance and income are no longer
                barriers to wellness, and where our platform strengthens the
                entire healthcare ecosystem for everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: The Difference */}
      <section className="py-32 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
          <div className="max-w-4xl mx-auto text-center mb-24">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-8 tracking-tight font-grotesk">
              The 24/7 TeleHealth Difference
            </h2>
            <p className="text-xl text-slate-600 font-medium leading-relaxed">
              We’ve built a platform that is more than just a video call with a
              doctor. It's a comprehensive ecosystem designed for the unique
              realities of our country.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              {
                title: "Truly 24/7 Access",
                desc: "Your health doesn't keep office hours, and neither do we. Whether it's a late-night fever or a weekend emergency, connect instantly.",
                icon: Ri24HoursFill,
                color: "text-[#36b1d4]",
                bg: "bg-[#36b1d4]/10",
              },
              {
                title: "Optimized for SA",
                desc: "Our platform is built to work seamlessly on low-bandwidth networks and even has an Offline Mode. Access vital information without data.",
                icon: HiOutlineLightningBolt,
                color: "text-[#005A9C]",
                bg: "bg-[#005A9C]/10",
              },
              {
                title: "We Speak Your Language",
                desc: "From English and Afrikaans to isiZulu, Sesotho, and Xhosa, our platform and our practitioners speak your language safely.",
                icon: FaLanguage,
                color: "text-purple-500",
                bg: "bg-purple-500/10",
              },
              {
                title: "Ubuntu at Our Core",
                desc: "We treat every patient with dignity, compassion, and respect, because your health is our shared responsibility.",
                icon: FaHandHoldingHeart,
                color: "text-rose-500",
                bg: "bg-rose-500/10",
              },
              {
                title: "End-to-End Security",
                desc: "Your privacy is non-negotiable. Fully compliant with SA POPIA regulations, using advanced encryption to keep your data safe.",
                icon: FaShieldAlt,
                color: "text-teal-600",
                bg: "bg-teal-600/10",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`p-10 rounded-lg bg-white hover:bg-slate-50 border border-slate-100 hover:border-[#36b1d4]/30 transition-all duration-300 group cursor-default ${i === 4 ? "lg:col-start-2" : ""}`}
              >
                <div
                  className={`w-20 h-20 rounded-lg ${feature.bg} ${feature.color} flex items-center justify-center text-4xl mb-8 group-hover:-translate-y-2 transition-transform duration-300`}
                >
                  <feature.icon />
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-4 font-grotesk">
                  {feature.title}
                </h4>
                <p className="text-slate-600 text-[1.1rem] leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Technology */}
      <section className="py-32 bg-[#020617] text-white relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#005A9C]/20 blur-[120px] opacity-60"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#36b1d4]/20 blur-[120px] opacity-60"></div>
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#36b1d4]/50 to-transparent"></div>

        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px] relative z-10">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <div className="lg:w-5/12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#36b1d4]/10 border border-[#36b1d4]/20 text-[#36b1d4] font-semibold text-sm tracking-normal  mb-8">
                Built for Everyone
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-[1.1] tracking-tight font-grotesk">
                Our Technology <br /> & Infrastructure
              </h2>
              <p className="text-xl text-slate-300 mb-12 leading-relaxed font-light">
                We've partnered with leading payment gateways like{" "}
                <span className="text-white font-semibold">
                  Peach, PayFast, and Ozow
                </span>{" "}
                to make paying for your care as easy as possible. But our true
                innovation lies in our absolute commitment to{" "}
                <span className="text-[#36b1d4]">accessibility.</span>
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-medium text-slate-200 hover:bg-white/10 transition-colors">
                  Peach Payments
                </div>
                <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-medium text-slate-200 hover:bg-white/10 transition-colors">
                  PayFast
                </div>
                <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-medium text-slate-200 hover:bg-white/10 transition-colors">
                  Ozow
                </div>
              </div>
            </div>

            <div className="lg:w-7/12 grid sm:grid-cols-2 gap-6 w-full">
              {[
                {
                  title: "Low-Bandwidth & Offline-First",
                  desc: "Our app uses a fraction of standard data, ensuring reliable 2G/3G consultations. Syncs automatically when back online.",
                  icon: HiOutlineLightningBolt,
                },
                {
                  title: "AI-Powered Triage",
                  desc: "Our 24/7 floating AI Triage button helps understand your symptoms and guides you to the right level of care.",
                  icon: BsRobot,
                },
                {
                  title: "Real-Time Insights",
                  desc: "The 'Nearest Medical Facility' widget with live wait times helps you make informed decisions about your care.",
                  icon: HiOutlineChartBar,
                },
              ].map((tech, i) => (
                <div
                  key={i}
                  className={`p-10 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#36b1d4]/50 transition-all duration-300 group ${i === 2 ? "sm:col-span-2 sm:w-1/2 sm:mx-auto" : ""}`}
                >
                  <div className="text-5xl text-[#36b1d4] mb-6 group-hover:scale-110 transition-transform origin-left">
                    <tech.icon />
                  </div>
                  <h4 className="text-2xl font-bold mb-4 text-white font-grotesk">
                    {tech.title}
                  </h4>
                  <p className="text-slate-400 text-lg leading-relaxed font-light">
                    {tech.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Impact & Numbers */}
      <section className="py-24 md:py-32 bg-linear-to-br from-[#00487c] to-[#005A9C] relative overflow-hidden">
        {/* Subtle decorative mesh or dots */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:30px_30px]"></div>

        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px] relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-20 tracking-tight font-grotesk">
            Our Projected Impact (2026)
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            {[
              { val: "800k+", label: "Happy Patients" },
              { val: "15 m", label: "Avg Wait Time" },
              { val: "30k+", label: "Active Professionals" },
              { val: "80%", label: "Reduction in Travel" },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center p-10 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors"
              >
                <span className="text-6xl md:text-7xl font-bold text-transparent bg-clip-text bg-linear-to-b from-white to-white/70 mb-4">
                  {stat.val}
                </span>
                <span className="text-lg text-[#36b1d4] font-bold  tracking-normal">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Meet the Team */}
      <section className="py-32 bg-slate-50">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-[3.5rem] font-bold text-slate-900 mb-6 tracking-tight font-grotesk">
              Meet the Team Behind the Mission
            </h2>
            <p className="text-xl text-slate-600 font-medium leading-relaxed">
              A dedicated team blending profound clinical expertise with
              world-class technology to transform South African healthcare.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
            {[
              {
                name: "Dr. Thabo Nkosi",
                role: "CEO & Co-Founder",
                desc: "A visionary public health leader with over 20 years of experience in the South African healthcare system.",
                img: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=2070&auto=format&fit=crop",
              },
              {
                name: "Zanele Dlamini",
                role: "CTO & Co-Founder",
                desc: "A tech innovator dedicated to building powerful, user-centric platforms for scaling social impact.",
                img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop",
              },
              {
                name: "Mmatshilo Mokoena",
                role: "Head of Clinical Services",
                desc: "A compassionate clinician ensuring the highest quality of care and safety for every single patient.",
                img: "https://images.unsplash.com/photo-1594824436951-7f12bc57a7e1?q=80&w=1934&auto=format&fit=crop",
              },
            ].map((member, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-lg border border-slate-100 transition-all duration-300 group text-center"
              >
                <div className="w-48 h-48 mx-auto xl:w-56 xl:h-56 mb-8 rounded-lg overflow-hidden border-[6px] border-[#f0f7ff] group-hover:border-[#36b1d4]/30 transition-colors duration-300 relative bg-slate-200">
                  <img
                    src={member.img}
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2 font-grotesk">
                  {member.name}
                </h3>
                <h4 className="text-[#36b1d4] font-bold tracking-normal  text-sm mb-6 font-grotesk">
                  {member.role}
                </h4>
                <p className="text-slate-600 text-lg leading-relaxed font-medium">
                  {member.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7 & 8: Trust & Partners */}
      <section className="py-32 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
          <div className="grid lg:grid-cols-2 gap-20 xl:gap-32 items-center">
            {/* Regulatory */}
            <div className="bg-slate-50 p-10 md:p-14 rounded-lg border border-slate-100">
              <h3 className="text-4xl font-bold text-slate-900 mb-6 tracking-tight font-grotesk">
                Regulatory Compliance
              </h3>
              <p className="text-slate-600 text-xl mb-10 leading-relaxed font-medium">
                We operate under the strictest regulatory oversight to ensure
                your safety and trust at all times.
              </p>
              <ul className="space-y-5">
                {[
                  "HPCSA Registered (Health Professions Council of SA)",
                  "POPIA Compliant (Protection of Personal Information Act)",
                  "Information Regulator Approved (Audit-ready context)",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-5 text-lg font-bold text-slate-800 bg-white p-5 rounded-lg border border-slate-100 shadow-none hover:shadow-md transition-shadow"
                  >
                    <span className="w-8 h-8 rounded-lg bg-[#36b1d4]/10 text-[#36b1d4] flex items-center justify-center shrink-0">
                      <FiCheck className="stroke-[3px]" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Partners */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#005A9C]/10 text-[#005A9C] font-semibold text-sm tracking-normal  mb-6">
                Collaboration
              </div>
              <h3 className="text-4xl font-bold text-slate-900 mb-6 tracking-tight font-grotesk">
                Our Partners
              </h3>
              <p className="text-slate-600 text-xl mb-12 leading-relaxed font-medium">
                We are proud to collaborate with leading South African
                organizations to expand access to modern care.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {["Discovery Health", "Momentum", "Mediclinic", "Netcare"].map(
                  (partner, i) => (
                    <div
                      key={i}
                      className="h-28 bg-white border-2 border-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 text-2xl hover:text-[#005A9C] hover:border-[#005A9C]/30 transition-all duration-300 cursor-default"
                    >
                      {partner}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 9: Join Us */}
      <section className="py-32 bg-[#020617] text-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#005A9C]/10 blur-[150px] opacity-80 pointer-events-none"></div>

        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px] relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight font-grotesk">
            Join Us on Our Journey
          </h2>
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-20 font-light">
            We are more than an app; we are a movement to reshape healthcare in
            our nation.{" "}
            <strong className="text-white font-medium">
              Where do you fit in?
            </strong>
          </p>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 max-w-[1600px] mx-auto">
            {[
              {
                title: "For Patients",
                desc: "Take control of your health. Get started in minutes.",
                cta: "Sign In For Free Care",
              },
              {
                title: "For Practitioners",
                desc: "Practice safely on your own terms. Expand your reach.",
                cta: "Partner with Us",
              },
              {
                title: "For Employers",
                desc: "Provide your team with 24/7 access to quality care.",
                cta: "Explore B2B Markets",
              },
              {
                title: "For Corporates",
                desc: "Be a part of the solution and invest in a healthier SA.",
                cta: "Contact Partnerships",
              },
            ].map((box, i) => (
              <div
                key={i}
                className="p-10 rounded-lg bg-white/5 backdrop-blur-sm text-left border border-white/10 hover:bg-white/10 hover:border-[#36b1d4]/50 hover:-translate-y-2 transition-all duration-300 group flex flex-col justify-between h-full min-h-[300px]"
              >
                <div>
                  <h4 className="text-3xl font-bold text-white mb-4 font-grotesk">
                    {box.title}
                  </h4>
                  <p className="text-slate-400 text-lg leading-relaxed mb-8">
                    {box.desc}
                  </p>
                </div>
                <button className="text-[#36b1d4] font-bold text-lg group-hover:text-white transition-colors flex items-center gap-3">
                  {box.cta}{" "}
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
