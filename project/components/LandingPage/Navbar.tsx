"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BiLink,
  BiChat,
  BiHeart,
  BiPhone,
  BiSun,
  BiCloud,
  BiCloudRain,
  BiCloudLightning,
  BiCloudSnow,
} from "react-icons/bi";
import Button from "../ui/Button";
import LogoMain from "../ui/LogoMain";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [weatherIcon, setWeatherIcon] = useState<React.ReactNode>(
    <BiSun className="text-white animate-pulse" />,
  );
  const [weatherText, setWeatherText] = useState("Detecting location...");
  const pathname = usePathname();

  // Set current date and fetch real weather
  useEffect(() => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-ZA", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    setCurrentDate(formattedDate);

    // Fetch real weather data based on geolocation (Open-Meteo, matches shared WeatherWidget)
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

        // Reverse geocode to get a human-readable location name
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

    // Request geolocation, falling back to Johannesburg (matches shared WeatherWidget)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherData(latitude, longitude);
        },
        () => fetchWeatherData(-26.2041, 28.0473),
        { timeout: 8000, maximumAge: 10 * 60 * 1000 },
      );
    } else {
      fetchWeatherData(-26.2041, 28.0473);
    }
  }, []);

  // Scroll effect for main navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About Us", href: "/about" },
    { name: "Approach", href: "/#approach" },
    { name: "Testimonials", href: "/#testimonials" },
    { name: "Blog", href: "/#blog" },
  ];

  return (
    <div className=" w-full">
      {/* Top Header Bar — transparent so the hero photo runs behind it. A thin
          white rule separates it from the nav row without reintroducing a solid
          band across the image. */}
      <div
        className={`w-full  text-white text-sm py-2 z-50 transition-all p-1.25 border-b ${
          scrolled ? "t" : "bg-primary border-white/15"
        }`}
      >
        <div className="container mx-auto max-w-350 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-0">
          <div className="flex gap-4">
            <span className="flex gap-2 items-center">
              <span className="text-base leading-none">{weatherIcon}</span>
              {weatherText}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="hover:opacity-80 transition"
            >
              <BiLink size={16} className="text-primary  " />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="hover:opacity-80 transition"
            >
              <BiChat size={16} className="text-primary" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hover:opacity-80 transition"
            >
              <BiHeart size={16} className="text-white" />
            </a>
            <div className="w-px h-4 bg-white/30" />
            <a
              href="tel:08001234567"
              className="flex items-center gap-2 font-medium hover:opacity-80 transition"
            >
              <BiPhone size={14} className="text-white" />
              <span>Toll Free: 0800 123 4567</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div
        className={`
          left-0 w-full z-40 transition-all duration-300
          ${scrolled ? "bg-primary backdrop-blur-xl border-b border-white/10" : "bg-transparent"}
          top-[44px] md:top-[44px] p-6.25
        `}
      >
        <div className="container mx-auto max-w-350 px-4 md:px-8 flex justify-between items-center py-3 md:py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <LogoMain width={200} height={40} alt={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`
                 text-white `}
              >
                <p className="text-white">{link.name}</p>
              </Link>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/login"
              className={`
                px-5 py-2 rounded-lg font-semibold transition-all duration-200
                ${
                  scrolled
                    ? "text-white border border-white/30 hover:bg-white/10"
                    : "text-white border border-white/40 hover:bg-white/10"
                }
              `}
            >
              <Button variant="white" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden relative w-8 h-8 flex flex-col justify-center items-center gap-1.5 z-50"
            aria-label="Toggle menu"
          >
            <span
              className={`
              w-6 h-0.5 rounded-lg transition-all duration-300
              ${scrolled ? "bg-slate-800" : "bg-white"}
              ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}
            `}
            />
            <span
              className={`
              w-6 h-0.5 rounded-lg transition-all duration-300
              ${scrolled ? "bg-slate-800" : "bg-white"}
              ${mobileMenuOpen ? "opacity-0" : ""}
            `}
            />
            <span
              className={`
              w-6 h-0.5 rounded-lg transition-all duration-300
              ${scrolled ? "bg-slate-800" : "bg-white"}
              ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}
            `}
            />
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <div
          className={`
          lg:hidden fixed inset-0 top-[72px] bg-white/95 backdrop-blur-xl z-40 transition-all duration-500 ease-in-out
          ${mobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}
        `}
        >
          <div className="flex flex-col items-center justify-start gap-2 pt-12 px-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-slate-700 text-lg font-medium hover:text-[#0052cc] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="flex flex-col gap-4 w-full pt-8">
              <Link
                href="/login"
                className="w-full text-center text-white py-3 rounded-lg border border-[#0052cc]/30  font-semibold hover:bg-[#0052cc]/5 transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="w-full text-center py-3 rounded-lg bg-gradient-to-r from-[#0052cc] to-[#00a3bf] text-white font-semibold hover:shadow-none transition"
              >
                Get Started{" "}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer removed to allow Hero to reach top */}
    </div>
  );
}
