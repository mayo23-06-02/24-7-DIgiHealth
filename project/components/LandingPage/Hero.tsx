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

const slides = [
  {
    videoSrc: "/landing-page/hero-section/Slide01.mp4",
    headline: "Compassionate Care.",
    highlight: "Real Doctors, Anywhere.",
    sub: "We invite you to take charge of your family's health.",
    description:
      "Skip the waiting room. Connect with verified South African doctors over secure video, chat, or AI-assisted triage — day or night, wherever you are.",
  },
  {
    videoSrc: "/landing-page/hero-section/Slide02.mp4",
    headline: "Your Data, Your Health,",
    highlight: "All in One Portal",
    sub: "In our portal you have all data in one place and direct access to the telemedicine service.",
    description:
      "Track your vitals, manage appointments, and securely access your medical history from anywhere. Your health journey, unified.",
  },
  {
    videoSrc: "/landing-page/hero-section/Slide03.mp4",
    headline: "Prescriptions & Certificates,",
    highlight: "Digital & Secure",
    sub: "Receive your prescription conveniently as a QR code: fast, discreet and paperless.",
    description:
      "Redeemable at any Swiss pharmacy or online pharmacy. Also request a certificate for incapacity to work with a single click.",
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
      className="text-xl md:text-6xl font-semibold text-secondary font-grotesk tabular-nums"
    >
      {display}
    </p>
  );
}

export default function Hero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [weatherIcon, setWeatherIcon] = useState<React.ReactNode>(
    <BiSun className="text-white animate-pulse" />,
  );
  const [weatherText, setWeatherText] = useState("Detecting location...");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [videoLoading, setVideoLoading] = useState(true);
  const [isSticky, setIsSticky] = useState(false);

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
          0: { label: "Clear", icon: <BiSun className="text-white" /> },
          1: { label: "Mainly Clear", icon: <BiSun className="text-white" /> },
          2: { label: "Partly Cloudy", icon: <BiCloud className="text-white" /> },
          3: { label: "Overcast", icon: <BiCloud className="text-white" /> },
          45: { label: "Foggy", icon: <BiCloud className="text-white/80" /> },
          51: { label: "Drizzle", icon: <BiCloudRain className="text-white" /> },
          61: { label: "Rainy", icon: <BiCloudRain className="text-white" /> },
          80: { label: "Showers", icon: <BiCloudRain className="text-white" /> },
          95: { label: "Stormy", icon: <BiCloudLightning className="text-white" /> },
          71: { label: "Snowy", icon: <BiCloudSnow className="text-white" /> },
        };
        const { label, icon } = mapping[current.weathercode] || {
          label: "Cloudy",
          icon: <BiCloud className="text-white" />,
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
        setWeatherIcon(<BiSun className="text-white" />);
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

  // Auto‑advance slides with smooth fade and loading reset
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setVideoLoading(true);
        setIsVisible(false);
      }, 500);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setVideoLoading(true);
    setIsVisible(false);
  }, [currentSlide]);

  const handleVideoLoaded = () => {
    setVideoLoading(false);
    setIsVisible(true);
  };

  const handleVideoError = () => {
    setVideoLoading(false);
    setIsVisible(true);
  };

  // Sticky header logic
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsSticky(scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const slide = slides[currentSlide];

  return (
    <section id="home" className="w-full  relative">
      {/* Sticky Header Container */}
      <div className="fixed top-0 left-0 w-full z-50">
        {/* Top Utility Bar - fades out when sticky */}
        <div
          className={`hidden md:flex w-full  backdrop-blur-md text-white text-sm py-2 px-4 md:px-8  transition-all duration-500 ${
            isSticky ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="container mx-auto max-w-350 flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{weatherIcon}</span>
                {weatherText}
              </span>
              <span className="hidden md:inline text-white/60">|</span>
              <span className="text-white/80 text-xs">{currentDate}</span>
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
          <div className="container mx-auto max-w-350 px-4 md:px-4 flex items-center justify-between py-2 md:py-2">
            <Link href="/" className="shrink-0">
              <LogoMain
                width={isSticky ? 100 : 160}
                height={isSticky ? 22 : 34}
                alt={isSticky ? false : true }
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
                      : "text-white/85 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                
              >
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button
                  variant={isSticky ? "primary" : "white"}
                  size="sm"
                  className={isSticky ? "" : "border border-white/30"}
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
                  isSticky ? "bg-ink-900" : "bg-white"
                } ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`}
              />
              <span
                className={`w-6 h-0.5 rounded-lg transition-all duration-300 ${
                  isSticky ? "bg-ink-900" : "bg-white"
                } ${mobileMenuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`w-6 h-0.5 rounded-lg transition-all duration-300 ${
                  isSticky ? "bg-ink-900" : "bg-white"
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

      {/* Hero Content */}
      <div className="relative m-1 rounded-xl h-[90vh] min-h-[560px] max-h-[880px] overflow-hidden flex flex-col ">
        {/* Video Background */}
        <div className="absolute inset-0 overflow-hidden">
          {videoLoading && (
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40 animate-pulse" />
          )}
          <video
            key={currentSlide}
            src={slide.videoSrc}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={handleVideoLoaded}
            onError={handleVideoError}
            className={`absolute inset-0 w-full h-full object-cover animate-slow-zoom transition-opacity duration-700

            `}
          />
          <div
            className={`absolute inset-0 bg-linear-to-r from-primary/25 via-white/10 to-primary/70 transition-opacity duration-500 ${
              isVisible && !videoLoading ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        {/* Hero copy */}
        <div
          className={`relative z-10 mx-auto w-full max-w-350 flex-1 flex flex-col justify-center px-5 md:px-10 transition-opacity duration-500 ${
            isVisible && !videoLoading ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="max-w-2xl mt-[10vh] md:mt-[15vh]">
            <div className="flex flex-wrap gap-2 mb-6">
              {serviceTags.map((tag, idx) => (
                <span
                  key={tag}
                  className={`px-4 py-1.5 rounded-full border border-white/30 text-white/90 text-xs md:text-sm font-medium transition-all duration-700 delay-${idx * 100} ${
                    isVisible && !videoLoading
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>

            <div
              className={`flex items-center gap-2 leading-4 text-white/90 text-sm mb-4 transition-all duration-700 delay-300 ${
                isVisible && !videoLoading
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              {slide.sub}
            </div>

            <h1
              className={`text-2xl md:text-4xl lg:text-6xl font-medium text-white leading-6 md:leading-9 lg:leading-[1.01] tracking-tight font-grotesk mb-6 drop-shadow-sm transition-all duration-700 delay-500 ${
                isVisible && !videoLoading
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              {slide.headline}
              <br />
              <span className="text-secondary font-bold">{slide.highlight}</span>
            </h1>

            <p
              className={`text-base md:text-lg text-white/90 leading-6 max-w-lg mb-8 transition-all duration-700 delay-700 ${
                isVisible && !videoLoading
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              {slide.description}
            </p>

            <div className="flex flex-wrap gap-3 mb-2 lg:hidden">
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Book Appointment
                </Button>
              </Link>
              <Link href="/patients">
                <Button variant="white" size="sm" iconPosition="left">
                  See How It Works
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Carousel Dot Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsVisible(false);
                setVideoLoading(true);
                setTimeout(() => {
                  setCurrentSlide(idx);
                }, 500);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentSlide
                  ? "bg-white w-8"
                  : "bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* ✨ UPGRADED RATING CARD ✨ */}
        <div className="hidden md:block relative z-10 mx-auto w-full max-w-350 px-5 md:px-10 pb-10">
          <div className="flex items-center gap-4 md:gap-6 lg:gap-8 bg-white rounded-lg  px-2 py-2 md:px-6 md:py-5 lg:px-4 lg:py-2 w-fit ml-auto">
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

      <div className="container mx-auto px-4 md:px-6 xl:px-8 md:max-w-350 xl:max-w-350 2xl:max-w-350">
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-none lg:flex lg:flex-row justify-between gap-3 md:gap-4 pb-4">
          {badges.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="rounded-lg p-4 md:p-6 flex flex-col gap-2"
            >
              <CountUpValue value={value} />
              <p className="text-xs md:text-sm text-ink-600 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}