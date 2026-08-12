"use client";
import React, { useState, useEffect, useRef } from "react";

const testimonialsData = [
  {
    id: 1,
    title: "Friendly staff review",
    text: "The team made every step stress-free and supportive. I finally feel confident about my treatment.",
    name: "Robert Fox",
    role: "Regular Tester",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=100&h=100",
    fullImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=600&h=800",
  },
  {
    id: 2,
    title: "Amazing Care",
    text: "The guidance and immediate support I received was unparalleled. The digital platform is so easy to use.",
    name: "Cody Fisher",
    role: "Regular Tester",
    image:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?fit=crop&w=100&h=100",
    fullImage:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?fit=crop&w=600&h=800",
  },
  {
    id: 3,
    title: "Seamless experience",
    text: "The team made every step stress-free and supportive. I finally feel confident about my treatment.",
    name: "Albert Flores",
    role: "Regular Tester",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=100&h=100",
    fullImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=600&h=800",
  },
  {
    id: 4,
    title: "Highly Professional",
    text: "Access to specialists anytime of the day is a game changer for my family. The diagnosis was prompt and accurate.",
    name: "Dianne Russell",
    role: "Patient",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?fit=crop&w=100&h=100",
    fullImage:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?fit=crop&w=600&h=800",
  },
  {
    id: 5,
    title: "Life-Saving Support",
    text: "I was able to get a consultation at 2 AM which saved me an unnecessary trip to the ER. Fantastic service.",
    name: "Leslie Alexander",
    role: "Parent",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?fit=crop&w=100&h=100",
    fullImage:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?fit=crop&w=600&h=800",
  },
  {
    id: 6,
    title: "Exceptional Convenience",
    text: "Booking a virtual visit takes exactly 2 minutes. The specialists are patient, thorough, and highly qualified.",
    name: "Wade Warren",
    role: "Regular User",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=crop&w=100&h=100",
    fullImage:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=crop&w=600&h=800",
  },
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(3);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };
    handleResize(); // Init
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxIndex = Math.max(0, testimonialsData.length - itemsPerView);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  return (
    <section
      id="testimonials"
      className="bg-white text-slate-900 text-center relative overflow-hidden py-20"
    >
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-10 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-primary font-extrabold text-xl">✦</span>
            <span className="text-primary font-semibold tracking-normal  text-sm">
              Testimonials
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-medium text-primary tracking-tight max-w-4xl leading-tight font-grotesk">
            Real Stories, Real Healing — From Our Community
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mt-4 ">
            Providing patient-centered care through expert guidance, innovative
            solutions, and personalized support every step of the way.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-[1400px] mx-auto">
          {/* Navigation Controls */}
          <div className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-12 z-20 hidden md:block">
            <button
              onClick={prevSlide}
              className="w-12 h-12 rounded-lg bg-white border border-slate-200  text-primary flex items-center justify-center hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Previous testimonials"
            >
              ←
            </button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-12 z-20 hidden md:block">
            <button
              onClick={nextSlide}
              className="w-12 h-12 rounded-lg bg-white border border-slate-200 text-primary flex items-center justify-center hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Next testimonials"
            >
              →
            </button>
          </div>

          {/* Slides Viewport */}
          <div className="overflow-hidden px-2 pb-8">
            <div
              ref={containerRef}
              className="flex transition-transform duration-500 ease-in-out gap-8"
              style={{
                transform: `translateX(calc(-${currentIndex * (100 / itemsPerView)}% - ${currentIndex * (2 / itemsPerView)}rem))`,
              }}
            >
              {testimonialsData.map((item, index) => {
                // Determine if this logic applies based on itemsPerView
                let isMiddle = false;
                if (itemsPerView === 3 && index === currentIndex + 1)
                  isMiddle = true;
                if (itemsPerView === 1 && index === currentIndex)
                  isMiddle = true;
                if (itemsPerView === 2 && index === currentIndex + 1)
                  isMiddle = true; // Make the rightmost one "middle", or left. Let's just pick index.

                const isHovered = hoveredCard === index;
                // If it is the middle card, it shows the background image by default, comments on hover.
                // If it is an edge card, it shows the comments by default, background image on hover.
                const shouldShowImage = isMiddle ? !isHovered : isHovered;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredCard(index)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className={`shrink-0 w-full relative min-h-[400px] cursor-pointer ${
                      itemsPerView === 3
                        ? "md:w-[calc(33.3333%-1.3333rem)]"
                        : itemsPerView === 2
                          ? "md:w-[calc(50%-1rem)]"
                          : "w-full"
                    }`}
                  >
                    {/* Light Card (Comments) */}
                    <div
                      className={`absolute inset-0 flex flex-col justify-between bg-white border border-slate-200 rounded-lg p-5 text-left  transition-all duration-300 ${
                        shouldShowImage
                          ? "opacity-0 invisible scale-95"
                          : "opacity-100 visible scale-100"
                      }`}
                    >
                      <div>
                        <h3 className="text-xl font-semibold text-primary mb-10 font-grotesk">
                          {item.title}
                        </h3>
                        <p className="text-slate-500 text-[1.05rem] leading-relaxed">
                          {item.text}
                        </p>
                      </div>

                      <div className="flex justify-between items-end mt-12">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover border-2 border-slate-50"
                          />
                          <div>
                            <h4 className="text-primary font-semibold text-sm font-grotesk">
                              {item.name}
                            </h4>
                            <p className="text-slate-500 text-xs">
                              {item.role}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 relative z-10">
                          <button
                            aria-label="X"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 transition text-xs font-serif font-bold"
                          >
                            X
                          </button>
                          <button
                            aria-label="Facebook"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 transition text-xs font-serif font-bold"
                          >
                            f
                          </button>
                          <button
                            aria-label="Play"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 transition text-xs"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Image Card (Photo Cover) */}
                    <div
                      className={`absolute inset-0 rounded-lg overflow-hidden  group transition-all duration-300 p-5 ${
                        shouldShowImage
                          ? "opacity-100 visible scale-100"
                          : "opacity-0 invisible scale-105"
                      }`}
                    >
                      <img
                        src={item.fullImage}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-[#1b80b7]/90 via-[#1b80b7]/20 to-transparent"></div>

                      <div className="absolute bottom-0 left-0 right-0 p-5 flex justify-between items-end">
                        <div className="text-left">
                          <h4 className="text-white font-semibold text-lg font-grotesk">
                            {item.name}
                          </h4>
                          <p className="text-white/80 text-sm font-medium">
                            {item.role}
                          </p>
                        </div>
                        <div className="flex gap-2 relative z-10">
                          <button
                            aria-label="X"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 transition text-xs font-serif font-bold"
                          >
                            X
                          </button>
                          <button
                            aria-label="Facebook"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 transition text-xs font-serif font-bold"
                          >
                            f
                          </button>
                          <button
                            aria-label="Play"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 transition text-xs"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dots Indicator for Mobile */}
        </div>
      </div>
    </section>
  );
}
