"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";
import LogoMain from "@/components/ui/LogoMain";
import SocialIcons from "./SocialIcons";
import { NAV_LINKS, SITE_CONTACT } from "@/config/site";
import { useLocalWeather } from "@/hooks/useLocalWeather";

type Variant = "solid" | "transparent";

export type SiteHeaderProps = {
  /**
   * "transparent" sits over a full-bleed hero and only gains a background once
   * the page is scrolled. "solid" is the default for inner pages, which have
   * ordinary content directly beneath the header.
   */
  variant?: Variant;
  /**
   * The strip above the nav carrying weather, date, socials and the toll-free
   * number. On by default for the transparent (home) treatment, off elsewhere,
   * but either page type can ask for it.
   */
  showUtilityBar?: boolean;
};

/**
 * The single public-site header.
 *
 * The home page used to carry its own copy of this markup inside Hero.tsx, so
 * a nav change had to be made twice and the two drifted — different logo
 * sizes, a utility bar on one and not the other, and only the inner-page
 * version highlighting the active link. Hero now renders this component with
 * `variant="transparent"`, so there is one header to maintain.
 *
 * Links and contact details come from config/site.ts.
 */
export default function SiteHeader({
  variant = "solid",
  showUtilityBar,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  const transparent = variant === "transparent";
  const withUtilityBar = showUtilityBar ?? transparent;

  useEffect(() => {
    // The transparent treatment overlays a tall hero, so it waits longer before
    // condensing; the solid one has content right beneath it and reacts sooner.
    const threshold = transparent ? 80 : 40;
    const handleScroll = () => setIsSticky(window.scrollY > threshold);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [transparent]);

  const navBarClass = transparent
    ? isSticky
      ? "bg-white/95 backdrop-blur-md rounded-full px-2 max-w-[1080px] mx-auto shadow-xs border-b border-slate-200"
      : "bg-transparent lg:px-12 md:px-10"
    : isSticky
      ? "bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200"
      : "bg-white border-b border-slate-100";

  return (
    <header className="fixed top-0 left-0 w-full z-50">
      {withUtilityBar && (
        <div
          className={`hidden md:flex w-full text-ink-600 text-sm py-2 px-4 md:px-8 transition-all duration-500 ${
            isSticky ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <UtilityBar />
        </div>
      )}

      <div className={`w-full transition-all duration-300 ${navBarClass}`}>
        <div className="container mx-auto max-w-[1400px] px-4 md:px-4 flex items-center justify-between py-2 md:py-2">
          <Link href="/" className="shrink-0" aria-label="24/7 DigiHealth home">
            <LogoMain
              width={isSticky ? 100 : 160}
              height={isSticky ? 22 : 34}
              alt={false}
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 ml-8">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-sm font-medium transition-colors ${
                    active
                      ? "text-primary font-bold"
                      : "text-ink-600 hover:text-primary"
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
            aria-expanded={mobileMenuOpen}
          >
            <span
              className={`w-6 h-0.5 rounded-lg bg-ink-900 transition-all duration-300 ${
                mobileMenuOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`w-6 h-0.5 rounded-lg bg-ink-900 transition-all duration-300 ${
                mobileMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`w-6 h-0.5 rounded-lg bg-ink-900 transition-all duration-300 ${
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
          <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 py-4 px-6 flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-ink-600 text-sm font-medium py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-ink-600 font-medium py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
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

/**
 * Split out so the weather hook only runs on pages that actually show the bar —
 * a hook called in the parent would fire its geolocation prompt and two network
 * requests even where the strip is hidden.
 */
function UtilityBar() {
  const { currentDate, weatherIcon, weatherText } = useLocalWeather();

  return (
    <div className="container mx-auto max-w-[1400px] flex flex-col md:flex-row justify-between items-center gap-2">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2">
          <span className="text-base leading-none">{weatherIcon}</span>
          {weatherText}
        </span>
        <span className="hidden md:inline text-ink-400">|</span>
        <span className="text-ink-600 text-xs">{currentDate}</span>
      </div>
      <div className="flex items-center gap-4">
        <SocialIcons />
        <div className="w-px h-4 bg-ink-400/30" />
        <a
          href={SITE_CONTACT.tollFreeHref}
          className="flex items-center gap-2 font-medium hover:opacity-80 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          <span>Toll Free: {SITE_CONTACT.tollFree}</span>
        </a>
      </div>
    </div>
  );
}
