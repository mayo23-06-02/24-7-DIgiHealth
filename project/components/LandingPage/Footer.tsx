"use client";
import React from "react";
import Link from "next/link";

const quickLinks = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Services", href: "/#approach" },
  { name: "Contact", href: "/#testimonials" },
];
// Both lists previously pointed at "#services" / "#team" — neither anchor
// exists on the page, so every one of these links was a no-op. They now target
// sections that actually render, or the signup flow where that's the real intent.
const services = [
  { name: "General Medicine", href: "/#approach" },
  { name: "Dental Care", href: "/#approach" },
  { name: "Pediatrics", href: "/#approach" },
  { name: "Women's Health", href: "/#approach" },
  { name: "Cardiology", href: "/#approach" },
  { name: "Physiotherapy", href: "/#approach" },
];
const doctors = [
  { name: "Our Specialists", href: "/#why-choose-us" },
  { name: "Qualifications & Expertise", href: "/about" },
  { name: "Patient Reviews", href: "/#testimonials" },
  { name: "Join Our Team", href: "/register" },
];

export default function Footer() {
  return (
    <footer
      className="bg-[#1a5b78] text-white pt-20 pb-10 pt-10 pb-5"
    >
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
        {/* Top Section */}
        <div className="flex flex-col lg:flex-row justify-between mb-16 gap-16 lg:gap-8">
          {/* Newsletter Section */}
          <div className="lg:w-5/12 flex flex-col">
            <h2 className="text-4xl md:text-4xl font-medium tracking-tight mb-4 leading-tight font-grotesk">
              Stay ahead of your <br className="hidden md:block" /> health
              journey
            </h2>
            <p className="text-white/80 text-[1.05rem] leading-relaxed max-w-md mb-8">
              Get expert insights, wellness guides, and clinic news — delivered
              monthly.
            </p>

            <form
              className="relative max-w-lg pt-5 pb-2.5"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="flex items-center border border-white/30 rounded-lg p-1.5 pl-6 bg-white/5 focus-within:border-white/60 transition-colors">
                <input
                  type="email"
                  placeholder="Enter Your Email"
                  className="bg-transparent border-none outline-none text-white placeholder-white/60 w-full text-[0.95rem] grow pr-4"
                  required
                />
                <button
                  type="submit"
                  className="bg-white text-[#1a5b78] font-semibold px-8 py-3 rounded-lg hover:bg-slate-100 transition-colors text-[0.95rem] hover:scale-105 duration-300 whitespace-nowrap"
                >
                  Subscribe
                </button>
              </div>
            </form>
          </div>

          {/* Links Section */}
          <div
            className="lg:w-8/12 flex flex-col sm:flex-row w-full sm:justify-between gap-10 md:gap-8 lg:pl-12 pt-5 pb-2.5"
          >
            {/* Quick Links */}
            <div className="flex flex-col col-span-1 gap-4">
              <h4 className="font-semibold text-[1.05rem] text-white mb-3 font-grotesk">
                Quick Links
              </h4>
              <ul className="flex flex-col gap-4">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-white/80 hover:text-white transition-colors text-[0.95rem]"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Our Services */}
            <div className="flex flex-col col-span-1 gap-4">
              <h4 className="font-semibold text-[1.05rem] text-white mb-3 font-grotesk">
                Our Services
              </h4>
              <ul className="flex flex-col gap-4">
                {services.map((service) => (
                  <li key={service.name}>
                    <Link
                      href={service.href}
                      className="text-white/80 hover:text-white transition-colors text-[0.95rem] inline-flex items-center min-h-11"
                    >
                      {service.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Doctors */}
            <div className="flex flex-col gap-4">
              <h4 className="font-semibold text-[1.05rem] text-white mb-3 font-grotesk">
                Doctors
              </h4>
              <ul className="flex flex-col gap-4">
                {doctors.map((doc) => (
                  <li key={doc.name}>
                    <Link
                      href={doc.href}
                      className="text-white/80 hover:text-white transition-colors text-[0.95rem] inline-flex items-center min-h-11"
                    >
                      {doc.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr
          className="border-t border-white/20 mb-8 pt-5 pb-2.5"
        />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 text-2xl font-medium tracking-tight hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-lg bg-[#1a5b78]"></div>
            </div>
            24/7 DigiHealth
          </Link>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            {/* X / Twitter */}
            <a
              href="#"
              aria-label="Twitter/X"
              className="w-[42px] h-[42px] rounded-lg border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors text-white/90 hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-[18px] h-[18px]"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
              </svg>
            </a>

            {/* Facebook */}
            <a
              href="#"
              aria-label="Facebook"
              className="w-[42px] h-[42px] rounded-lg border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors text-white/90 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"></path>
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="#"
              aria-label="YouTube"
              className="w-[42px] h-[42px] rounded-lg border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors text-white/90 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path>
              </svg>
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right text-white/70 text-[0.9rem] flex flex-col gap-1">
            <p>© 2026 24/7 DigiHealth. All rights reserved.</p>
            <p>Designed with care for healthier communities.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
