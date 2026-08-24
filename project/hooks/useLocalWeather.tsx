"use client";

import React, { useEffect, useState } from "react";
import {
  BiSun,
  BiCloud,
  BiCloudRain,
  BiCloudLightning,
  BiCloudSnow,
} from "react-icons/bi";

/** Johannesburg — used when the visitor declines or has no geolocation. */
const FALLBACK_COORDS = { lat: -26.2041, lon: 28.0473 };

const WEATHER_CODES: Record<number, { label: string; icon: React.ReactNode }> = {
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

/**
 * Local date plus current weather for the header's utility bar.
 *
 * Lifted out of Hero.tsx when the header became shared — it is presentation
 * detail for one strip of the chrome, and leaving it inline made the header
 * component hard to read. Every failure path degrades to a readable label
 * rather than throwing: a decorative strip must never be able to break a page.
 */
export function useLocalWeather() {
  const [currentDate, setCurrentDate] = useState("");
  const [weatherIcon, setWeatherIcon] = useState<React.ReactNode>(
    <BiSun className="text-primary animate-pulse" />,
  );
  const [weatherText, setWeatherText] = useState("Detecting location...");

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

        const { label, icon } = WEATHER_CODES[current.weathercode] || {
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
        (position) =>
          fetchWeatherData(position.coords.latitude, position.coords.longitude),
        () => fetchWeatherData(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon),
        { timeout: 8000, maximumAge: 10 * 60 * 1000 },
      );
    } else {
      fetchWeatherData(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon);
    }
  }, []);

  return { currentDate, weatherIcon, weatherText };
}
