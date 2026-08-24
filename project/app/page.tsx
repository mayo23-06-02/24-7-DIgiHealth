"use client";

import Hero from "@/components/LandingPage/Hero";
import AboutUs from "@/components/LandingPage/AboutUs";
import ServicesGallery from "@/components/LandingPage/ServicesGallery";
import TickerBar from "@/components/LandingPage/TickerBar";
import Approach from "@/components/LandingPage/Approach";
import WhyChooseUs from "@/components/LandingPage/WhyChooseUs";
import TrustStrip from "@/components/LandingPage/TrustStrip";
import WhyUrgentCare from "@/components/LandingPage/WhyUrgentCare";
import DoctorsSection from "@/components/LandingPage/DoctorsSection";
import ProcessSteps from "@/components/LandingPage/ProcessSteps";
import BookingCTA from "@/components/LandingPage/BookingCTA";
import TeamGrid from "@/components/LandingPage/TeamGrid";
import Testimonials from "@/components/LandingPage/Testimonials";
import Blog from "@/components/LandingPage/Blog";
import AudienceRouter from "@/components/LandingPage/AudienceRouter";
import Footer from "@/components/LandingPage/Footer";

export default function LandingPage() {
  return (
    <main className="relative w-full overflow-hidden">
      {/* Hero renders its own nav row inside the inset hero card. */}
      <Hero />
      <AboutUs />
      <WhyUrgentCare />
      <ServicesGallery />
      <TickerBar />
      <Approach />
      <WhyChooseUs />
      <WhyUrgentCare />
      <DoctorsSection />
      <ProcessSteps />
      <BookingCTA />
   
      <AudienceRouter />
      <Footer />
    </main>
  );
}
