"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import LogoMain from "@/components/ui/LogoMain";
import { usePathname } from "next/navigation";

const navLinks = [
  { name: "Platform", href: "/" },
  { name: "About", href: "/about" },
  { name: "For Patients", href: "/patients" },
  { name: "For Doctors", href: "/doctors" },
  { name: "Contact", href: "/contact" },
];

/**
 * Shared nav for every inner marketing page (About, Patients, Doctors,
 * Contact). Home keeps its own richer header inside Hero.tsx (weather,
 * slide carousel, sticky-on-scroll animation) since that's tied to the
 * hero's own state — this is the plain, always-solid version for pages
 * that don't have a full-bleed video hero underneath it.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-50">
      <div
        className={`w-full transition-all duration-300 ${
          isSticky
            ? "bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200"
            : "bg-white border-b border-slate-100"
        }`}
      >
        <div className="container mx-auto max-w-350 px-4 md:px-8 flex items-center justify-between py-3">
          <Link href="/" className="shrink-0">
            <LogoMain width={140} height={30} alt={false} />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 ml-8">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    active
                      ? "text-primary font-bold"
                      : "text-ink-700 hover:text-primary"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">
                Get Started
              </Button>
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden relative w-8 h-8 flex flex-col justify-center items-center gap-1.5 z-50"
            aria-label="Toggle menu"
          >
            <span
              className={`w-6 h-0.5 rounded-lg bg-ink-800 transition-all duration-300 ${
                mobileMenuOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`w-6 h-0.5 rounded-lg bg-ink-800 transition-all duration-300 ${
                mobileMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`w-6 h-0.5 rounded-lg bg-ink-800 transition-all duration-300 ${
                mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>

        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white border-b border-slate-200 py-4 px-6 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-ink-700 text-sm font-medium py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-ink-700 font-medium py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-white bg-primary py-2 px-3 rounded-lg font-semibold hover:bg-primary-600 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
