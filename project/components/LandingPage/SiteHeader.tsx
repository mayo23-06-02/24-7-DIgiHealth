"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";
import LogoMain from "@/components/ui/LogoMain";
import SocialIcons from "./SocialIcons";
import { NAV_LINKS, SITE_CONTACT } from "@/config/site";
import { useLocalWeather } from "@/hooks/useLocalWeather";

export type SiteHeaderProps = {
  /**
   * The strip above the nav carrying weather, date, socials and the toll-free
   * number.
   *
   * On everywhere by default. It used to be on for home only, which is what
   * made the header look like two different headers depending on which
   * marketing page you were on — the nav itself was already identical.
   * Individual pages can still opt out.
   */
  showUtilityBar?: boolean;
};

/**
 * The single public-site header.
 *
 * One bar, one size, one position. It used to change shape as you scrolled:
 * the utility strip faded away, the nav detached into a floating rounded pill
 * with its own narrower width, and the logo shrank from 160px to 100px. Three
 * things moving at once meant the page never settled, and the header you
 * clicked was never quite the header you had been looking at.
 *
 * Now both bars are pinned together with `position: sticky` and simply stay
 * put — same width, same height, same logo, whether you are at the top of the
 * page or the bottom of it. Sticky rather than fixed so the header occupies
 * its own space in the flow: nothing underneath has to guess its height and
 * pad itself to compensate, which is what the `lg:pt-44` on every inner page
 * was doing.
 *
 * Links and contact details come from config/site.ts.
 */
export default function SiteHeader({ showUtilityBar }: SiteHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const withUtilityBar = showUtilityBar ?? true;

  return (
    // The transform used by the reveal animation would otherwise become the
    // containing block for the sticky positioning, so it lives on the inner
    // wrapper and this element stays a plain sticky container.
    <header className="sticky top-0 z-50 w-full">
      <div className="header-reveal">
        {withUtilityBar && (
          <div className="hidden md:block w-full bg-primary text-white text-sm py-2 px-4 md:px-8">
            <UtilityBar />
          </div>
        )}

        <div className="w-full bg-white border-b border-slate-200 shadow-xs">
          <div className="container mx-auto max-w-[1400px] px-4 md:px-4 flex items-center justify-between py-2 md:py-2">
            <Link href="/" className="shrink-0" aria-label="24/7 DigiHealth home">
              <LogoMain width={160} height={34} alt={false} />
            </Link>

            <nav className="hidden lg:flex items-center gap-8 ml-8">
              {NAV_LINKS.map((link, i) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    // Staggered so the links arrive after the bar itself has
                    // landed, rather than riding down with it.
                    style={{ animationDelay: `${180 + i * 60}ms` }}
                    className={`header-item-reveal text-sm font-medium transition-colors ${
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

            <div
              className="header-item-reveal hidden lg:flex items-center gap-3"
              style={{ animationDelay: `${180 + NAV_LINKS.length * 60}ms` }}
            >
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
            <div className="bg-white border-t border-slate-100 py-4 px-6 flex flex-col gap-2">
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
        <span className="hidden md:inline text-white/50">|</span>
        <span className="text-white/80 text-xs">{currentDate}</span>
      </div>
      <div className="flex items-center gap-4">
        <SocialIcons />
        <div className="w-px h-4 bg-white/30" />
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
