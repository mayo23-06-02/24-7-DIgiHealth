"use client";

import React, { useState, useEffect } from "react";
import {
  BiSun,
  BiCloud,
  BiCloudRain,
  BiCloudLightning,
  BiCloudSnow,
} from "react-icons/bi";
import { WeatherData } from "./types";

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData>({
    temp: 24,
    condition: "Loading...",
    location: "Detecting location...",
    icon: <BiSun className="text-gray-400 text-xl animate-pulse" />,
  });

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) throw new Error("Weather API unreachable");
        const data = await res.json();
        const current = data?.current_weather;
        if (!current) throw new Error("No weather data");

        const mapping: Record<number, { label: string; icon: any }> = {
          0: { label: "Clear", icon: <BiSun className="text-gray-400" /> },
          1: { label: "Mainly Clear", icon: <BiSun className="text-gray-300" /> },
          2: { label: "Partly Cloudy", icon: <BiCloud className="text-slate-500" /> },
          3: { label: "Overcast", icon: <BiCloud className="text-slate-500" /> },
          45: { label: "Foggy", icon: <BiCloud className="text-slate-300" /> },
          51: { label: "Drizzle", icon: <BiCloudRain className="text-sky-400" /> },
          61: { label: "Rainy", icon: <BiCloudRain className="text-blue-500" /> },
          80: { label: "Showers", icon: <BiCloudRain className="text-blue-400" /> },
          95: { label: "Stormy", icon: <BiCloudLightning className="text-gray-600" /> },
          71: { label: "Snowy", icon: <BiCloudSnow className="text-sky-100" /> },
        };

        const { label, icon } = mapping[current.weathercode] || {
          label: "Cloudy",
          icon: <BiCloud className="text-slate-500" />,
        };

        setWeather({
          temp: Math.round(current.temperature),
          condition: label,
          location: `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`,
          icon,
        });
      } catch {
        setWeather({
          temp: 24,
          condition: "Offline",
          location: "Location unverified",
          icon: <BiSun className="text-gray-400" />,
        });
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(-26.2041, 28.0473), // fallback: Johannesburg
        { timeout: 8000, maximumAge: 10 * 60 * 1000 }
      );
    } else {
      fetchWeather(-26.2041, 28.0473);
    }
  }, []);

  return (
    <div className="flex items-center gap-2 text-slate-800">
      <span className="text-sm">{weather.icon}</span>
      <p className="text-xs font-bold">
        {weather.temp}°C {weather.condition}
      </p>
    </div>
  );
}