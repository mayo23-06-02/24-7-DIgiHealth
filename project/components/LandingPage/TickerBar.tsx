"use client";

import React from "react";

const items = [
  "Care Every Day",
  "Where Medical Expertise Meets Compassion",
  "Your Health Comes First",
  "24/7 Access Across South Africa",
  "Verified Practitioners",
];

export default function TickerBar() {
  const track = [...items, ...items];

  return (
    <div className="bg-secondary py-2 overflow-hidden">
      <div className="flex whitespace-nowrap animate-marquee motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0">
            {track.map((text, i) => (
              <span
                key={`${copy}-${i}`}
                className="flex items-center text-ink-900 font-bold text-sm md:text-base px-6 font-grotesk"
              >
                {text}
                <span className="ml-6 opacity-50">•</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
