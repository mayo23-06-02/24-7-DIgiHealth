"use client";

import React from "react";
import Image from "next/image";
import { Heart, Shield, Clock, Users, Sparkles, Globe, User, Stethoscope, MapPin } from "lucide-react";

// Reuse the same counter component from Hero (or you can import it)
function CountUpValue({ value }: { value: string }) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const hasAnimated = React.useRef(false);
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  const [display, setDisplay] = React.useState(match ? `0${match[2]}` : value);

  React.useEffect(() => {
    if (!match) return;
    const target = parseFloat(match[1]);
    const suffix = match[2];
    const isDecimal = match[1].includes(".");
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || hasAnimated.current) return;
          hasAnimated.current = true;

          const duration = 2500;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            setDisplay(`${isDecimal ? current.toFixed(1) : Math.round(current)}${suffix}`);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <p
      ref={ref}
      className="text-2xl md:text-4xl lg:text-5xl font-light text-ink-900 font-grotesk tabular-nums"
    >
      {display}
    </p>
  );
}

const aboutStats = [
  { icon: User, value: "135K+", label: "Patients Cared For" },
  { icon: Stethoscope, value: "50+", label: "Verified Specialists" },
  { icon: MapPin, value: "9", label: "Provinces Covered" },
];

const values = [
  {
    icon: Heart,
    title: "Patient First",
    description: "Every decision we make starts with what's best for the patient.",
  },
  {
    icon: Shield,
    title: "Trust & Privacy",
    description: "Your data is yours. We follow POPIA and global security standards.",
  },
  {
    icon: Clock,
    title: "24/7 Access",
    description: "Healthcare doesn't clock out – and neither do we.",
  },
  {
    icon: Users,
    title: "Human Connection",
    description: "Technology enables care, but our doctors and nurses deliver it with empathy.",
  },
 
  {
    icon: Globe,
    title: "Inclusive Reach",
    description: "Serving all nine provinces, with multi‑language support and fair pricing.",
  },
];

export default function AboutUs() {
  return (
    <section id="about" className="bg-surface-soft py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
            About 24/7 DigiHealth
          </span>
          <h2 className="text-3xl md:text-4xl font-medium text-ink-900 mb-6 tracking-tight font-grotesk">
            Our Mission: <span className="text-primary font-bold">Telehealth for Everyone</span>
          </h2>
          <p className="text-lg text-ink-600 leading-relaxed">
            We believe that quality healthcare should be accessible, affordable, and human –
            no matter where you live. Our platform connects you with verified doctors,
            AI‑powered triage, and a digital health record that puts you in control.
          </p>
        </div>

        {/* Stats Row – matches hero style with animated counters */}
      

        {/* Values Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-white border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-ink-900 mb-2 font-grotesk">{title}</h3>
              <p className="text-sm text-ink-600 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA / Story */}
        <div className="mt-16 bg-primary/5 rounded-2xl p-8 md:p-12 text-center">
          <p className="text-lg md:text-xl text-ink-700 max-w-2xl mx-auto leading-relaxed">
            “We're not just building an app – we're reimagining how South Africans
            access healthcare. Join us in making quality care a right, not a privilege.”
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">AM</span>
            </div>
            <div className="text-left">
              <p className="font-bold text-ink-900 text-sm">Amanda Mazwi</p>
              <p className="text-xs text-ink-500">Founder</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}