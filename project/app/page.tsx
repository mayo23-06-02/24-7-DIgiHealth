"use client";

import Navbar from "@/components/LandingPage/Navbar";
import Hero from "@/components/LandingPage/Hero";
import StatsSection from "@/components/LandingPage/StatsSection";
import AboutUs from "@/components/LandingPage/AboutUs";
import Testimonials from "@/components/LandingPage/Testimonials";
import Blog from "@/components/LandingPage/Blog";
import Approach from "@/components/LandingPage/Approach";
import WhyChooseUs from "@/components/LandingPage/WhyChooseUs";
import Footer from "@/components/LandingPage/Footer";

export default function LandingPage() {
  return (
    <main className="w-full overflow-hidden">
      <Navbar />
      <Hero />
      <StatsSection />
      <AboutUs />
      <Approach />
      <WhyChooseUs />
      <Testimonials />
      <Blog />
      <Footer />
    </main>
  );
}
