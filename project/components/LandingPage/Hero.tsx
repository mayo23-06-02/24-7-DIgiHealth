"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import TickerBar from "./TickerBar";
import SiteHeader from "./SiteHeader";

const serviceTags = ["Tele-health Care", "E-Prescriptions", "Family Plans"];

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
    phrase: "for immediate access to healthcare",
    description:
      "Most patients are seen the same day. Book a consultation and speak to a practitioner without leaving home.",
  },
  {
    phrase: "for prescriptions, digital and secure",
    description:
      "Your prescriptions are stored securely in your digital health record — view or download them anytime, no paper scripts to lose.",
  },
  {
    phrase: "for your whole health record, in one place",
    description:
      "Track your vitals, manage appointments, and securely access your medical history from anywhere. Your health journey, unified.",
  },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

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

  const line = rotatingLines[currentSlide];

  return (
    <section id="home" className="w-full bg-white  relative">
      <SiteHeader />

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
            <span className="block text-3xl md:text-5xl lg:text-6xl font-semibold leading-[1.05]">
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
      </div>

      <TickerBar />

    

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