"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaPhoneAlt,
} from "react-icons/fa";
import { BiCalendar, BiUpArrow } from "react-icons/bi";
import Button from "../ui/Button";
import LogoMain from "../ui/LogoMain";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [weather, setWeather] = useState("☀️ 24°C | Cape Town");
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

    // Fetch real weather data based on geolocation
    const fetchWeatherData = async (lat: number, lon: number) => {
      try {
        // Open-Meteo API (free, no key required)
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
        );
        if (!weatherRes.ok) throw new Error("Weather fetch failed");
        const weatherData = await weatherRes.json();
        const temp = Math.round(weatherData.current.temperature_2m);
        const code = weatherData.current.weather_code;

        // Get emoji for weather code (WMO)
        let emoji = "☀️";
        if (code === 0) emoji = "☀️";
        else if (code === 1 || code === 2) emoji = "⛅";
        else if (code === 3) emoji = "☁️";
        else if (code >= 45 && code <= 48) emoji = "🌫️";
        else if (code >= 51 && code <= 67) emoji = "🌧️";
        else if (code >= 71 && code <= 77) emoji = "❄️";
        else if (code >= 80 && code <= 82) emoji = "🌧️";
        else if (code >= 85 && code <= 86) emoji = "❄️";
        else if (code === 80 || code === 81 || code === 82) emoji = "⛈️";

        // Reverse geocode to get location name
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        );
        if (!geoRes.ok) throw new Error("Geocoding failed");
        const geoData = await geoRes.json();
        const city =
          geoData.address?.city ||
          geoData.address?.town ||
          geoData.address?.county ||
          "Your Location";

        setWeather(`${emoji} ${temp}°C | ${city}`);
      } catch (err) {
        console.warn("Weather fetch error, using default:", err);
        setWeather("☀️ 24°C | Your Location");
      }
    };

    // Request geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherData(latitude, longitude);
        },
        (error) => {
          console.warn("Geolocation denied, using default:", error);
          setWeather("☀️ 24°C | South Africa");
        },
      );
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
        className={`w-full bg-primary text-white text-sm py-2 z-50 transition-all p-1.25 border-b ${
          scrolled ? "bg-primary border-transparent" : "bg-primary border-white/15"
        }`}
      >
        <div className="container mx-auto max-w-[1400px] px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-0">
          <div className="flex gap-4">
            <span className="flex gap-2 items-center">{weather}</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="hover:opacity-80 transition"
            >
              <FaFacebookF size={14} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="hover:opacity-80 transition"
            >
              <FaTwitter size={14} />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hover:opacity-80 transition"
            >
              <FaInstagram size={14} />
            </a>
            <div className="w-px h-4 bg-white/30" />
            <a
              href="tel:08001234567"
              className="flex items-center gap-2 font-medium hover:opacity-80 transition"
            >
              <FaPhoneAlt size={12} />
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
        <div className="container mx-auto max-w-[1600px] px-4 md:px-8 flex justify-between items-center py-3 md:py-4">
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
