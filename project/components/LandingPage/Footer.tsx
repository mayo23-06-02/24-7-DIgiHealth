import React from "react";
import Link from "next/link";
import LogoMain from "@/components/ui/LogoMain";
import { FOOTER_COLUMNS } from "@/config/site";

export default function Footer() {
  return (
    <footer
      className="bg-[#1a5b78] text-white pt-20 pb-10 pt-10 pb-5"
    >
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-350 xl:max-w-350 2xl:max-w-350">
        {/* Top Section */}
        <div className="flex flex-col lg:flex-row justify-between mb-16 gap-16 lg:gap-8">
          {/* Brand mark. This column previously held a newsletter capture,
              removed at the client's request. */}
          <div className="lg:w-5/12 flex flex-col">
            <Link href="/" className="inline-flex" aria-label="24/7 DigiMedCare home">
              <LogoMain width={220} height={48} alt />
            </Link>
            <p className="text-white/80 text-[1.05rem] leading-relaxed max-w-md mt-6">
              Same-day virtual consultations with vetted South African doctors,
              for your whole family — day or night, wherever you are.
            </p>
          </div>

          {/* Links Section */}
          <div
            className="lg:w-8/12 flex flex-col sm:flex-row w-full sm:justify-between gap-10 md:gap-8 lg:pl-12 pt-5 pb-2.5"
          >
            {/* Columns come from config/site.ts, so adding a footer link is a
                one-line change there rather than an edit to this markup. */}
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading} className="flex flex-col gap-4">
                <h4 className="font-semibold text-[1.05rem] text-white mb-3 font-grotesk">
                  {column.heading}
                </h4>
                <ul className="flex flex-col gap-4">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-white/80 hover:text-white transition-colors text-[0.95rem] inline-flex items-center min-h-11"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
            24/7 DigiMedCare
          </Link>

          {/* Copyright */}
          <div className="text-center md:text-right text-white/70 text-[0.9rem] flex flex-col gap-1">
            <p>© 2026 24/7 DigiMedCare. All rights reserved.</p>
            <p>Designed with care for healthier communities.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
