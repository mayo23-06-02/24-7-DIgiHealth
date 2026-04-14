"use client";
import React, { useEffect } from "react";
import Navbar from "@/components/LandingPage/Navbar";
import Hero from "@/components/LandingPage/Hero";
import AboutUs from "@/components/LandingPage/AboutUs";
import WhyChooseUs from "@/components/LandingPage/WhyChooseUs";
import Approach from "@/components/LandingPage/Approach";
import Testimonials from "@/components/LandingPage/Testimonials";
import Blog from "@/components/LandingPage/Blog";
import StatsSection from "@/components/LandingPage/StatsSection";
import Footer from "@/components/LandingPage/Footer";

export default function LandingPage() {
  useEffect(() => {
    // Reveal Animations Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          }
        });
      },
      { threshold: 0.1 },
    );

    document
      .querySelectorAll(".reveal-hidden")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="landing-wrapper relative scroll-smooth"
    >
      <div className="absolute top-0 left-0 z-40 right-0">
        <Navbar />
      </div>
      <Hero />
      <AboutUs />
      <WhyChooseUs />
      <Approach />
      <Testimonials />
      <Blog />
      <Footer />
    </div>
  );
}
