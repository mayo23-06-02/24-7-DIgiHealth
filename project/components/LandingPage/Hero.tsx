import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

const slides = [
  {
    image: "/LandingPage/bg-1.jpg",
    titleLine1: "Your Trusted",
    titleLine2: "Partner in Modern",
    titleLine3: "Healthcare",
    boxValue: "97%",
    boxLabel: "Trusted Care Rate",
    boxDesc: "Consistently satisfied with our treatment & support.",
    gridItems: ["Caring", "Personalized", "Reliable"],
  },
  {
    image: "/LandingPage/bg-2.jpg",
    titleLine1: "AI-Powered",
    titleLine2: "Symptom Triage",
    titleLine3: "For Everyone",
    boxValue: "11",
    boxLabel: "Languages Supported",
    boxDesc: "Accurate symptom analysis fine-tuned for SA accents.",
    gridItems: ["Fast", "Accurate", "Inclusive"],
  },
  {
    image: "/LandingPage/bg-3.jpg",
    titleLine1: "Instant Access",
    titleLine2: "To Top Specialists",
    titleLine3: "24/7 Support",
    boxValue: "50+",
    boxLabel: "Active Specialists",
    boxDesc: "Connecting you with the best doctors effortlessly.",
    gridItems: ["Secure", "Convenient", "Private"],
  },
];

export default function Hero() {
  const [scrollPos, setScrollPos] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollPos(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7000); // 7 seconds per slide
    return () => clearInterval(interval);
  }, []);

  const slide = slides[currentSlide];

  return (
    <section
      id="home"
      className="h-screen relative overflow-hidden flex flex-col bg-black max-w-full"
    >
      {/* Carousel Background layer with Parallax */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          transform: `translate3d(0, ${scrollPos * 0.3}px, 0)`,
        }}
      >
        {slides.map((s, index) => (
          <div
            key={index}
            style={{
              backgroundImage: `url('${s.image}')`,
              opacity: currentSlide === index ? 1 : 0,
            }}
            className="absolute inset-0 bg-cover bg-top transition-opacity duration-1500 ease-in-out"
          />
        ))}
        {/* Gradient Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/40 to-accent/20" />
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px] flex-1 flex flex-col justify-center relative z-10 mt-[20vh]">
        <div className="max-w-[1600px] transition-opacity duration-600 ease-in-out">
          <div className="trusted-badge text-white mb-4">
            <span className="text-white font-normal ml-2">
              Trusted by 135k+ people
            </span>
          </div>

          <h1 className="heading-hero text-white mb-10 min-h-[220px] flex flex-col justify-center text-[clamp(2rem,3.5vw,3.5rem)] font-grotesk">
            <span className="block">{slide.titleLine1}</span>
            <span className="block">{slide.titleLine2}</span>
            <span className="block">{slide.titleLine3}</span>
          </h1>

          <Button
            variant="white"
            size="lg"
            icon={<span className="btn-icon-wrapper">→</span>}
          >
            Explore Services
          </Button>
        </div>
      </div>

      {/* Hero Bottom Bar */}
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px] grid grid-cols-[1.2fr_0.8fr] pb-[6rem] items-end relative z-10">
        <div className="reveal-hidden reveal-visible max-w-[550px] text-white">
          <h3 className="text-2xl font-bold mb-4 font-grotesk">Comprehensive Care</h3>
          <p className="text-base opacity-85 leading-relaxed">
            Accessible, modern medical care — where technology meets compassion.
            Get Started, view reports, and stay healthy from anywhere.
          </p>
        </div>

        <div className="flex gap-6 justify-end">
          {/* Dynamic Stats Card */}
          <div className="bg-primary card w-[240px] text-white flex flex-col justify-center rounded-lg p-6">
            <p className="text-[0.9rem] opacity-70 mb-6">{slide.boxLabel}</p>
            <div className="text-[3.8rem] font-bold leading-none">
              {slide.boxValue}
            </div>
            <p className="text-[0.85rem] opacity-80 mt-4">{slide.boxDesc}</p>
          </div>

          {/* Dynamic Grid Card */}
          <div className="card w-[240px] bg-white/15 border border-white/25 text-white flex flex-col gap-4 p-6 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-[55px] border border-white/30 rounded-lg grid place-items-center">
                ✕
              </div>
              <div className="h-[55px] bg-white/10 rounded-lg grid place-items-center font-semibold">
                {slide.gridItems[0]}
              </div>
            </div>
            <div className="h-[50px] bg-white text-primary rounded-lg grid place-items-center font-bold">
              {slide.gridItems[1]}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-[55px] border border-white/30 rounded-lg grid place-items-center">
                ✕
              </div>
              <div className="h-[55px] bg-white/10 rounded-lg grid place-items-center font-semibold">
                {slide.gridItems[2]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Slide Indicators */}
      <div className="absolute bottom-[2rem] left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <div
            key={i}
            onClick={() => setCurrentSlide(i)}
            style={{
              width: currentSlide === i ? "45px" : "15px",
            }}
            className={`h-1 transition-all duration-300 cursor-pointer rounded-sm ${currentSlide === i ? "bg-white" : "bg-white/40"}`}
          />
        ))}
      </div>
    </section>
  );
}
