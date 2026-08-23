"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";
import LogoMain from "@/components/ui/LogoMain";
import {
  PlayCircle,
  Users,
  HeartPulse,
  Clock,
  MapPin,
  Sparkle,
  ArrowRight,
  Star,
  Menu,
  X,
} from "lucide-react";
import { BiSun, BiCloud, BiCloudRain, BiCloudLightning, BiCloudSnow } from "react-icons/bi";
import TickerBar from "./TickerBar";

const badges = [
  { icon: Users, value: "50+", label: "Verified Specialists" },
  { icon: HeartPulse, value: "135K+", label: "Patients Cared For" },
  { icon: Clock, value: "24/7", label: "Always Available" },
  { icon: MapPin, value: "9", label: "Provinces Covered" },
];

const navLinks = [
  { name: "About", href: "/about" },
  { name: "For Patients", href: "/patients" },
  { name: "For Doctors", href: "/doctors" },
  { name: "Pricing", href: "/pricing" },
  { name: "Contact", href: "/contact" },
];

const serviceTags = ["Tele-health Care", "E-Prescriptions", "Family Plans"];

const ratingAvatars = [
  "https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=100&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?q=80&w=100&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=100&auto=format&fit=crop",
];

/**
 * The headline's first line is fixed; only this second line rotates, sliding
 * down from above as it changes. Each entry keeps its own supporting sentence
 * so the copy underneath stays coherent with whichever phrase is showing.
 */
const rotatingLines = [
  {
    phrase: "for all your family's medical needs",
    description:
      "Skip the waiting room. Connect with verified South African doctors over secure video, chat, or voice — day or night, wherever you are.",
  },
  {
    phrase: "for care in minutes, not weeks",
    description:
      "Most patients are seen the same day. Book a consultation and speak to a practitioner without leaving home.",
  },
  {
    phrase: "for prescriptions, digital and secure",
    description:
      "Receive your prescription as a QR code — fast, discreet and paperless, redeemable at any partner pharmacy.",
  },
  {
    phrase: "for your whole health record, in one place",
    description:
      "Track your vitals, manage appointments, and securely access your medical history from anywhere. Your health journey, unified.",
  },
];

function CountUpValue({ value }: { value: string }) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const hasAnimated = React.useRef(false);
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  const [display, setDisplay] = React.useState(match ? `0${match[2]}` : value);

  React.useEffect(() => {
    if (!match) return;
    const target = parseFloat(match[1]);
    const suffix = match[2];
    const isDecimal = match[1].includes(".");
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || hasAnimated.current) return;
          hasAnimated.current = true;

          const duration = 2500;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            setDisplay(`${isDecimal ? current.toFixed(1) : Math.round(current)}${suffix}`);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <p
      ref={ref}
      className="text-xl md:text-6xl font-semibold text-ink-900 font-grotesk tabular-nums"
    >
      {display}
    </p>
  );
}

export default function Hero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [weatherIcon, setWeatherIcon] = useState<React.ReactNode>(
    <BiSun className="text-primary animate-pulse" />,
  );
  const [weatherText, setWeatherText] = useState("Detecting location...");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isSticky, setIsSticky] = useState(false);

  /**
   * The hero background is now a slow, self-contained CSS gradient rather than
   * video or imagery — nothing to download, so it paints instantly on any
   * connection. Visitors who ask for reduced motion get the same gradient held
   * still, and the rotating line stops advancing rather than sliding.
   */
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  // Weather and date (unchanged)
  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-ZA", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );

    const fetchWeatherData = async (lat: number, lon: number) => {
      try {
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
          { signal: AbortSignal.timeout(8000) },
        );
        if (!weatherRes.ok) throw new Error("Weather fetch failed");
        const weatherData = await weatherRes.json();
        const current = weatherData?.current_weather;
        if (!current) throw new Error("No weather data");

        const mapping: Record<number, { label: string; icon: React.ReactNode }> = {
          0: { label: "Clear", icon: <BiSun className="text-primary" /> },
          1: { label: "Mainly Clear", icon: <BiSun className="text-primary" /> },
          2: { label: "Partly Cloudy", icon: <BiCloud className="text-primary" /> },
          3: { label: "Overcast", icon: <BiCloud className="text-primary" /> },
          45: { label: "Foggy", icon: <BiCloud className="text-primary/80" /> },
          51: { label: "Drizzle", icon: <BiCloudRain className="text-primary" /> },
          61: { label: "Rainy", icon: <BiCloudRain className="text-primary" /> },
          80: { label: "Showers", icon: <BiCloudRain className="text-primary" /> },
          95: { label: "Stormy", icon: <BiCloudLightning className="text-primary" /> },
          71: { label: "Snowy", icon: <BiCloudSnow className="text-primary" /> },
        };
        const { label, icon } = mapping[current.weathercode] || {
          label: "Cloudy",
          icon: <BiCloud className="text-primary" />,
        };

        let city = "Your Location";
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { signal: AbortSignal.timeout(5000) },
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            city =
              geoData.address?.city ||
              geoData.address?.town ||
              geoData.address?.county ||
              "Your Location";
          }
        } catch {
          /* keep default city label */
        }

        setWeatherIcon(icon);
        setWeatherText(`${Math.round(current.temperature)}°C ${label} | ${city}`);
      } catch (err) {
        console.warn("Weather fetch error, using default:", err);
        setWeatherIcon(<BiSun className="text-primary" />);
        setWeatherText("Weather unavailable");
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeatherData(position.coords.latitude, position.coords.longitude),
        () => fetchWeatherData(-26.2041, 28.0473),
        { timeout: 8000, maximumAge: 10 * 60 * 1000 },
      );
    } else {
      fetchWeatherData(-26.2041, 28.0473);
    }
  }, []);

  // Advance the rotating line. Only the second line and its supporting
  // sentence change; the first line is fixed, so there is no fade of the whole
  // block — the incoming phrase animates itself in via the `key` change below.
  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % rotatingLines.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  // Sticky header logic
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsSticky(scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const line = rotatingLines[currentSlide];

  return (
    <section id="home" className="w-full  relative">
      {/* Sticky Header Container */}
      <div className="fixed top-0 left-0 w-full z-50">
        {/* Top Utility Bar - fades out when sticky */}
        <div
          className={`hidden md:flex w-full  backdrop-blur-md text-ink-600 text-sm py-2 px-4 md:px-8  transition-all duration-500 ${
            isSticky ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
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
              <a
                href="#"
                className="hover:opacity-80 transition"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
                </svg>
              </a>
              <a
                href="#"
                className="hover:opacity-80 transition"
                aria-label="Twitter"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#"
                className="hover:opacity-80 transition"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <div className="w-px h-4 bg-white/30" />
              <a
                href="tel:08001234567"
                className="flex items-center gap-2 font-medium hover:opacity-80 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Toll Free: 0800 123 4567</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar - becomes sticky with background */}
        <div
          className={`w-full transition-all duration-300 ${
            isSticky
              ? "bg-white/95 backdrop-blur-md rounded-full px-2 max-w-[1080px] mx-auto   shadow-xs border-b border-slate-200"
              : "bg-transparent lg:px-12 md:px-10"
          }`}
        >
          <div className="container mx-auto max-w-[1400px] px-4 md:px-4 flex items-center justify-between py-2 md:py-2">
            <Link href="/" className="shrink-0">
              <LogoMain
                width={isSticky ? 100 : 160}
                height={isSticky ? 22 : 34}
                alt={false}
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-8 ml-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isSticky
                      ? "text-ink-600 hover:text-primary"
                      : "text-ink-600 hover:text-primary"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className=""
                >
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="primary"
                  size="sm"
                  className=""
                >
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
                className={`w-6 h-0.5 rounded-lg transition-all duration-300 ${
                  "bg-ink-900"
                } ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`}
              />
              <span
                className={`w-6 h-0.5 rounded-lg transition-all duration-300 ${
                  "bg-ink-900"
                } ${mobileMenuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`w-6 h-0.5 rounded-lg transition-all duration-300 ${
                  "bg-ink-900"
                } ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}
              />
            </button>
          </div>

          <div
            className={`lg:hidden overflow-hidden transition-all duration-300 ${
              mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 py-4 px-6 flex flex-col gap-2">
              {navLinks.map((link) => (
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

      {/* Hero Content — animated gradient ground, centred copy */}
      <div className="relative m-1 rounded-xl min-h-[640px] h-[88vh] max-h-[860px] overflow-hidden flex flex-col items-center justify-center hero-gradient">
        <div className="relative z-10 mx-auto w-full max-w-3xl px-5 md:px-10 text-center">
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {serviceTags.map((tag) => (
              <span
                key={tag}
                className="px-4 py-1.5 rounded-full border border-primary/25 bg-white text-primary-600 text-xs md:text-sm font-semibold shadow-xs"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="font-grotesk tracking-tight text-ink-900">
            {/* Fixed line — never changes, so it stays perfectly still. */}
            <span className="block text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05]">
              Choose DigiHealth
            </span>

            {/*
              Rotating line. The clip container is a fixed height so the block
              below never shifts as phrases of different lengths swap in, and
              the `key` restarts the slide-down animation on each change.
            */}
            {/*
              The size classes live on the CLIPPING span, not the inner one, so
              `h-[Xem]` resolves against the phrase's own font-size. Previously
              they sat on the inner span, so `em` resolved against the h1's
              inherited 16px and the box was ~24px tall — which is what was
              slicing the descenders off the rotating line.
            */}
            <span className="block overflow-hidden mt-3 text-xl md:text-3xl lg:text-4xl leading-[1.3] h-[2.6em] sm:h-[1.3em]">
              <span
                key={currentSlide}
                className="block font-light text-primary hero-line-in"
              >
                {line.phrase}
              </span>
            </span>
          </h1>

          <p
            key={`desc-${currentSlide}`}
            className="mt-6 text-sm md:text-base text-ink-600 leading-relaxed max-w-xl mx-auto hero-desc-in"
          >
            {line.description}
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-9">
            <Link href="/register">
              <Button variant="primary">Book Appointment</Button>
            </Link>
            <Link href="/patients">
              <Button variant="white" iconPosition="left">
                See How It Works
              </Button>
            </Link>
          </div>

          {/* Progress dots double as manual controls for the rotating line. */}
          <div className="flex justify-center gap-2 mt-10">
            {rotatingLines.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide
                    ? "bg-primary w-8"
                    : "bg-primary/25 w-2 hover:bg-primary/50"
                }`}
                aria-label={`Show: ${rotatingLines[idx].phrase}`}
              />
            ))}
          </div>
        </div>

        {/* ✨ UPGRADED RATING CARD ✨ */}
        <div className="hidden md:block absolute bottom-0 inset-x-0 z-10 mx-auto w-full max-w-[1400px] px-5 md:px-10 pb-10">
          <div className="flex items-center gap-4 md:gap-6 lg:gap-8 bg-white rounded-lg shadow-sm px-2 py-2 md:px-6 md:py-5 lg:px-4 lg:py-2 w-fit ml-auto">
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-lg md:text-2xl lg:text-2xl font-bold text-ink-900 font-grotesk">
                4.9
              </span>
              <Star
                size={20}
                className="fill-yellow-400 text-yellow-400 md:w-6 md:h-6 lg:w-7 lg:h-7"
              />
            </div>
            <div className="h-10 md:h-12 lg:h-14 w-px bg-slate-200" />
            <div className="flex items-center">
              {ratingAvatars.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt="Happy patient"
                  width={40}
                  height={40}
                  className="w-8 h-8  rounded-full object-cover  shadow-sm"
                  style={{ marginLeft: i === 0 ? 0 : -8 }}
                />
              ))}
              <div
                className="w-8 h-8  rounded-full bg-primary text-white flex items-center justify-center text-[10px] md:text-xs  shadow-sm"
                style={{ marginLeft: -8 }}
              >
                +2K
              </div>
            </div>
            <div>
              <p className="text-sm  font-bold text-ink-900 leading-tight font-grotesk">
                Happy
                <br />
                Customers
              </p>
            </div>
          </div>
        </div>
      </div>

      <TickerBar />

      <div className="bg-secondary">
        <div className="container mx-auto px-4 md:px-6 xl:px-8 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-none lg:flex lg:flex-row justify-between gap-3 md:gap-4 py-4">
            {badges.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="rounded-lg p-4 md:p-6 flex flex-col gap-2"
              >
                <CountUpValue value={value} />
                <p className="text-xs md:text-sm text-ink-900 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Subtle drifting gradient — pure CSS, so nothing is downloaded and it
           paints on the first frame regardless of connection. */
        .hero-gradient {
          background: linear-gradient(
            125deg,
            #eaf5f9 0%,
            #f6fbfd 22%,
            #dbeef7 45%,
            #eef7fb 68%,
            #d7ecf6 85%,
            #eaf5f9 100%
          );
          background-size: 300% 300%;
          animation: heroDrift 24s ease-in-out infinite;
        }

        @keyframes heroDrift {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        /* The rotating line enters from above and settles — the fixed line
           above it never moves. */
        .hero-line-in {
          animation: lineDown 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes lineDown {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero-desc-in {
          animation: descFade 620ms ease both;
          animation-delay: 90ms;
        }

        @keyframes descFade {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-gradient {
            animation: none;
          }
          .hero-line-in,
          .hero-desc-in {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}