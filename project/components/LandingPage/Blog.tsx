"use client";
import React from "react";

const blogPosts = [
  {
    id: 1,
    title: "5 Daily Habits for a Healthier Heart you deserve.",
    excerpt:
      "Adopt simple daily habits like balanced eating, regular exercise, and stress control to strengthen your heart and boost longevity.",
    date: "Jan 25, 2025",
    image:
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Top Benefits of Regular Health Checkups.",
    excerpt:
      "Discover how routine health checkups help detect issues early, prevent serious diseases, and promote long-term physical and mental wellness.",
    date: "Jan 25, 2025",
    image:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=2064&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "The Link Between Stress & Physical Health.",
    excerpt:
      "Understand how unmanaged stress affects your body and why regular health checkups are vital for early detection and prevention.",
    date: "Jan 25, 2025",
    image:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop",
  },
];

export default function Blog() {
  return (
    <section
      id="blog"
      className="py-24 bg-slate-100 text-slate-900 overflow-hidden"
    >
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
        {/* Header Area */}
        <div className="flex flex-col gap-6 mb-16">
          <div className="flex items-center gap-2">
            <span className="text-[#36b1d4] font-extrabold text-xl">✦</span>
            <span className="text-[#36b1d4] font-medium tracking-normal uppercase text-sm">
              Blog
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-16 items-start py-10">
            <h2 className="text-3xl md:text-4xl font-medium text-[#005A9C] leading-[1.15] tracking-tight">
              Explore Expert Insights for a <br className="hidden lg:block" />{" "}
              Healthier, Happier Life
            </h2>
            <div className="flex items-center h-full">
              <p className="text-[1.05rem] text-slate-600 leading-relaxed max-w-lg mt-2 lg:mt-6">
                Discover expert health insights, wellness advice, and medical
                updates to help you make informed decisions and live a healthier
                life every day.
              </p>
            </div>
          </div>
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <div
              key={post.id}
              className="flex bg-white rounded-lg flex-col group cursor-pointer p-5"
            >
              {/* Image Container */}
              <div className="rounded-lg  overflow-hidden mb-8 h-[240px] md:h-[300px] w-full bg-slate-100">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>

              {/* Title & Excerpt */}
              <h3 className="text-[1.6rem] md:text-xl font-medium text-[#005A9C] mb-4 leading-[1.3] group-hover:text-[#36b1d4] transition-colors pr-2 pt-5 pb-2.5">
                {post.title}
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6 grow text-[0.95rem] md:text-base pr-4">
                {post.excerpt}
              </p>

              {/* Card Footer (Read More & Date) */}

              <div className="flex justify-between items-center mt-auto pt-6 border-t border-slate-100 pb-2.5">
                {/* Pill effect on hover containing Read More and Arrow */}
                <div className="flex items-center gap-3 px-1 py-1 rounded-lg border border-transparent group-hover:border-slate-200 transition-all duration-300 group-hover:px-4 group-hover:-ml-3 bg-white">
                  <span className="text-[#36b1d4] font-medium text-[0.95rem]">
                    Read More
                  </span>
                  <div className="w-[38px] h-[38px] rounded-lg border border-[#36b1d4] text-[#36b1d4] flex items-center justify-center transition-all duration-300 group-hover:bg-[#005A9C] group-hover:border-[#005A9C] group-hover:text-white">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
                <span className="text-slate-400 text-[0.9rem] font-medium">
                  {post.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
