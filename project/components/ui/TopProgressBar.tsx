"use client";

import React, { useEffect, useRef } from "react";

const TRICKLE_MS = 300;
const FADE_OUT_MS = 320;

/**
 * Indeterminate top-of-viewport progress bar for route changes.
 *
 * Trickles asymptotically toward 90% while `active`, then snaps to 100% and
 * fades out. Driven by NavigationProgressProvider.
 *
 * The animation is written directly to the DOM through refs rather than held
 * in React state. This provider sits above the whole app, and a bar that
 * re-rendered three times a second would be pure overhead — an animation like
 * this is exactly the "synchronize with an external system" case that effects
 * are for.
 *
 * All positioning/sizing is inline `style` on purpose: the `@layer utilities`
 * block at the bottom of globals.css redefines every spacing utility with
 * `!important`, so Tailwind spacing classes are not trustworthy here.
 */
export default function TopProgressBar({ active }: { active: boolean }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const bar = barRef.current;
    if (!wrap || !bar) return;

    const paint = () => {
      bar.style.width = `${progressRef.current}%`;
      wrap.setAttribute("aria-valuenow", String(Math.round(progressRef.current)));
    };

    const stopTrickle = () => {
      if (trickleRef.current) {
        clearInterval(trickleRef.current);
        trickleRef.current = null;
      }
    };

    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }

    if (active) {
      stopTrickle();
      progressRef.current = 8;
      wrap.style.display = "block";
      bar.style.opacity = "1";
      paint();

      trickleRef.current = setInterval(() => {
        const p = progressRef.current;
        if (p >= 90) return;
        // Fast out of the gate, crawling as it approaches the ceiling.
        const step = p < 25 ? 6 : p < 55 ? 3 : p < 75 ? 1.5 : 0.6;
        progressRef.current = Math.min(90, p + step);
        paint();
      }, TRICKLE_MS);
    } else {
      stopTrickle();
      if (progressRef.current > 0) {
        progressRef.current = 100;
        paint();
        bar.style.opacity = "0";
        hideRef.current = setTimeout(() => {
          progressRef.current = 0;
          wrap.style.display = "none";
          paint();
        }, FADE_OUT_MS);
      } else {
        wrap.style.display = "none";
      }
    }

    return stopTrickle;
  }, [active]);

  useEffect(
    () => () => {
      if (trickleRef.current) clearInterval(trickleRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
    },
    [],
  );

  return (
    <div
      ref={wrapRef}
      role="progressbar"
      aria-label="Page loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      style={{
        display: "none",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 9999,
        pointerEvents: "none",
        background: "rgba(68, 147, 184, 0.12)",
      }}
    >
      <div
        ref={barRef}
        className="nav-progress-bar"
        style={{
          position: "relative",
          height: "100%",
          width: "0%",
          background:
            "linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 60%, var(--color-accent) 100%)",
          boxShadow:
            "0 0 8px rgba(83, 203, 243, 0.7), 0 0 3px rgba(68, 147, 184, 0.9)",
          transition: "width 200ms ease-out, opacity 250ms ease-out",
          opacity: 1,
        }}
      >
        {/* Travelling glow at the leading edge */}
        <span
          className="nav-progress-glow"
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width: "120px",
            background:
              "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.85))",
            animation: "var(--animate-nav-progress-pulse)",
          }}
        />
      </div>
    </div>
  );
}
