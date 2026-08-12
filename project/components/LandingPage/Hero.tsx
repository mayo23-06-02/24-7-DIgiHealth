"use client";
import React, { useEffect, useState } from "react";
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

export default function Hero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [weatherIcon, setWeatherIcon] = useState<React.ReactNode>(
    <BiSun className="text-ink-500 animate-pulse" />,
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
        );
        if (!weatherRes.ok) throw new Error("Weather fetch failed");
        const weatherData = await weatherRes.json();
        const current = weatherData?.current_weather;
        if (!current) throw new Error("No weather data");

        const mapping: Record<number, { label: string; icon: React.ReactNode }> = {
          0: { label: "Clear", icon: <BiSun className="text-ink-500" /> },
          1: { label: "Mainly Clear", icon: <BiSun className="text-ink-500" /> },
          2: { label: "Partly Cloudy", icon: <BiCloud className="text-ink-500" /> },
          3: { label: "Overcast", icon: <BiCloud className="text-ink-500" /> },
          45: { label: "Foggy", icon: <BiCloud className="text-ink-400" /> },
          51: { label: "Drizzle", icon: <BiCloudRain className="text-ink-500" /> },
          61: { label: "Rainy", icon: <BiCloudRain className="text-ink-500" /> },
          80: { label: "Showers", icon: <BiCloudRain className="text-ink-500" /> },
          95: { label: "Stormy", icon: <BiCloudLightning className="text-ink-500" /> },
          71: { label: "Snowy", icon: <BiCloudSnow className="text-ink-500" /> },
        };
        const { label, icon } = mapping[current.weathercode] || {
          label: "Cloudy",
          icon: <BiCloud className="text-ink-500" />,
        };

        let city = "Your Location";
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
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
        setWeatherIcon(<BiSun className="text-ink-500" />);
        setWeatherText("Weather unavailable");
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeatherData(position.coords.latitude, position.coords.longitude),
        () => fetchWeatherData(-26.2041, 28.0473),
      );
    } else {
      fetchWeatherData(-26.2041, 28.0473);
    }
  }, []);

  return (
    <section id="home" className="w-full bg-primary-50/60 pt-4 md:pt-6">
      <div className="container mx-auto px-4 md:px-6 xl:px-8 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
        {/* Utility line: real date + live weather/location, sits above the card */}
        <div className="hidden md:flex items-center justify-between px-2 pb-3 text-xs font-medium text-ink-500">
          <span>{currentDate}</span>
          <span className="flex items-center gap-2">
            <span className="text-base leading-none">{weatherIcon}</span>
            {weatherText}
          </span>
        </div>

        {/* Inset hero card */}
        <div className="relative rounded-[2rem] overflow-hidden h-[80vh] min-h-[560px] max-h-[880px] flex flex-col">
          <img
            src="/LandingPage/bg-1.jpg"
            alt="24/7 DigiHealth care team"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/15 to-ink-900/80" />

          {/* Nav row, transparent overlay directly on the image */}
          <div className="relative z-10 flex items-center justify-between gap-4 px-5 py-5 md:px-10 md:py-8">
            <Link href="/" className="shrink-0">
              <LogoMain width={170} height={34} alt={true} />
            </Link>

            <nav className="hidden lg:flex items-center gap-7">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-white/85 hover:text-white transition-colors"
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
                  className="text-white/90 text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-white/10 transition-colors"
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
          <div className="relative z-10 flex-1 flex flex-col justify-center px-5 md:px-10 max-w-2xl">
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

          {/* Floating rating card */}
          <div className="hidden md:flex absolute bottom-8 right-8 md:bottom-10 md:right-10 z-10 items-center gap-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-1 text-3xl font-bold text-white font-grotesk">
              4.9
              <Star size={18} className="fill-secondary text-secondary mb-3" />
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

        {/* Stat badges, lifted so they straddle the bottom edge of the card. */}
        <div className="relative z-10 -mt-12 md:-mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-16">
          {badges.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="bg-white rounded-lg border border-border shadow-lg p-4 md:p-6 flex flex-col gap-2"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon size={18} />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-ink-900 font-grotesk">{value}</p>
              <p className="text-xs md:text-sm text-ink-500 font-medium leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
