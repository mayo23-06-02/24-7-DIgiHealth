"use client";
import React, { useEffect, useRef, useState } from "react";
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
  { name: "Home", href: "/" },
  { name: "About Us", href: "/about" },
  { name: "Approach", href: "/#approach" },
  { name: "Testimonials", href: "/#testimonials" },
  { name: "Blog", href: "/#blog" },
];

const serviceTags = [
  "Virtual Care",
  "AI Triage",
  "Specialists",
  "Prescriptions",
  "Family Plans",
];

const ratingAvatars = [
  "https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=100&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?q=80&w=100&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=100&auto=format&fit=crop",
];

function CountUpValue({ value }: { value: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const hasAnimated = useRef(false);
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  const [display, setDisplay] = useState(match ? `0${match[2]}` : value);

  useEffect(() => {
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

          const duration = 1500;
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
      className="text-xl md:text-6xl font-light text-ink-900 font-grotesk tabular-nums"
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

  // Real date + live weather/location, matching components/shared/Header/WeatherWidget.tsx
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

  return (
    <section id="home" className="w-full bg-primary-50/60">
      {/* Full-bleed hero photo: reaches the very top of the screen and spans
          the whole viewport width, while its content stays aligned to the
          1400px grid via an inner container. */}
      <div className="relative m-4 rounded-4xl h-[90vh] min-h-[560px] max-h-[880px] overflow-hidden flex flex-col">
        <img
          src="/hero2.jpg"
          alt="24/7 DigiHealth care team"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900/75 via-ink-900/0 to-ink-900/70" />

        {/* Utility line: real date + live weather/location, overlaid on the image */}
        <div className="hidden md:flex relative z-10 mx-auto w-full max-w-[1400px] items-center justify-between px-5 md:px-10 pt-4 text-xs font-medium text-white/75">
          <span>{currentDate}</span>
          <span className="flex items-center gap-2">
            <span className="text-base leading-none">{weatherIcon}</span>
            {weatherText}
          </span>
        </div>

        {/* Nav row, transparent overlay directly on the image */}
        <div className="relative z-10 mx-auto w-full max-w-[1400px] flex items-center justify-between px-5 py-5 md:px-10 md:py-6">
          <Link href="/" className="shrink-0">
            <LogoMain width={170} height={34} alt={true} />
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-white/85 transition-all ease-in-out duration-600 hover:text-white hover:ring-2 hover:ring-white px-4 py-2 rounded-full"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:block">
            <Link href="/register">
              <button className="group flex items-center gap-3 pl-5 pr-1.5 py-1.5 rounded-full bg-primary hover:bg-primary-600 text-white text-sm font-semibold transition-colors">
                Book Now
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight size={15} />
                </span>
              </button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile menu panel */}
        <div
          className={`lg:hidden relative z-20 overflow-hidden transition-all duration-300 ${
            mobileMenuOpen ? "max-h-96" : "max-h-0"
          }`}
        >
          <div className="mx-5 mb-4 flex flex-col gap-1 rounded-2xl bg-ink-900/80 backdrop-blur-xl border border-white/10 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/90 text-sm font-medium py-2.5 px-2 rounded-lg  transition-colors hover:ring-2 hover:ring-white"
              >
                {link.name}
              </Link>
            ))}
            <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="mt-2">
              <Button variant="primary" size="sm">
                Book Now
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 mx-auto w-full max-w-[1400px] flex-1 flex flex-col justify-center px-5 md:px-10">
          <div className="max-w-2xl mt-[20vh]">
            <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
              <Sparkle size={16} className="text-secondary" />
              We invite you to take charge of your family&apos;s health.
            </div>

            <h1 className="text-4xl md:text-6xl font-medium text-white leading-[1.05] tracking-tight font-grotesk mb-6 drop-shadow-sm">
              Compassionate Care.
              <br />
              <span className="text-secondary font-bold">Real Doctors, Anywhere.</span>
            </h1>

            <div className="flex flex-wrap gap-2 mb-6">
              {serviceTags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-1.5 rounded-full border border-white/30 text-white/90 text-xs md:text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-lg mb-8">
              Skip the waiting room. Connect with verified South African doctors
              over secure video, chat, or AI-assisted triage — day or night,
              wherever you are.
            </p>

            <div className="flex flex-wrap gap-3 lg:hidden">
              <Link href="/register">
                <Button variant="primary" size="lg">
                  Book Appointment
                </Button>
              </Link>
              <Link href="/#approach">
                <Button variant="white" size="lg" icon={<PlayCircle size={18} />} iconPosition="left">
                  See How It Works
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Floating rating card, aligned to the same 1400px content edge */}
        <div className="hidden md:block relative z-10 mx-auto w-full max-w-[1400px] px-5 md:px-10 pb-10">
          <div className="flex items-center gap-4 bg-white/10  border border-white/20 rounded-2xl px-5 py-4 w-fit ml-auto">
            <div className="flex items-center gap-1 text-3xl font-bold text-white font-grotesk">
              4.9
              <Star size={18} className="fill-green-500 text-green-500 mb-3" />
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="flex items-center">
              {ratingAvatars.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt="Happy patient"
                  className="w-9 h-9 rounded-full object-cover border-2 border-white/40"
                  style={{ marginLeft: i === 0 ? 0 : -12 }}
                />
              ))}
              <div
                className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-[10px] font-bold"
                style={{ marginLeft: -12 }}
              >
                +2K
              </div>
            </div>
            <p className="text-white text-sm font-semibold leading-tight">
              Happy
              <br />
              Customers
            </p>
          </div>
        </div>
      </div>
      <TickerBar />

      <div className="container mx-auto px-4 md:px-6 xl:px-8 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
        {/* Stat badges, lifted so they straddle the bottom edge of the photo. */}
        <div className="relative z-10  grid grid-cols-2 lg:grid-cols-none lg:flex lg:flex-row justify-between gap-3 md:gap-4 pb-4">
          {badges.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className=" rounded-lg  p-4 md:p-6 flex flex-col gap-2"
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
