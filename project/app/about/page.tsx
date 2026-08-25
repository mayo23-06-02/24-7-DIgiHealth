"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/LandingPage/SiteHeader";
import Footer from "@/components/LandingPage/Footer";
import Button from "@/components/ui/Button";
import {
  Heart,
  Shield,
  Clock,
  Users,
  Globe,
  User,
  Stethoscope,
  MapPin,
  ArrowRight,
} from "lucide-react";

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
          const duration = 2000;
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
    <p ref={ref} className="text-4xl md:text-5xl font-bold text-white font-grotesk tabular-nums">
      {display}
    </p>
  );
}

const values = [
  { icon: Heart, title: "Patient First", description: "Every decision we make starts with what's best for the patient." },
  { icon: Shield, title: "Trust & Privacy", description: "Your data is yours. We follow POPIA and global security standards." },
  { icon: Clock, title: "24/7 Access", description: "Healthcare doesn't clock out – and neither do we." },
  { icon: Users, title: "Human Connection", description: "Technology enables care, but our doctors and nurses deliver it with empathy." },
  { icon: Globe, title: "Inclusive Reach", description: "Serving all nine provinces, with multi-language support and fair pricing." },
];

const stats = [
  { icon: User, value: "135K+", label: "Patients Cared For" },
  { icon: Stethoscope, value: "50+", label: "Verified Specialists" },
  { icon: MapPin, value: "9", label: "Provinces Covered" },
];

const team = [
  { name: "Amanda Mazwi", role: "Founder", initials: "AM" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* Hero */}
      <section className="relative pt-10 pb-20 lg:pt-20 md:pb-28 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?q=80&w=1600&auto=format&fit=crop"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-ink-900/90 via-ink-900/70 to-ink-900/40" />
        <div className="relative container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="max-w-3xl">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-4">
              Our Story
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white leading-[1.1] tracking-tight font-grotesk mb-6">
              Healthcare shouldn't depend on your postal code.
            </h1>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl">
              24/7 DigiHealth started with a simple frustration: too many South
              Africans wait weeks for a GP appointment, or drive hours to
              reach a specialist. We built the platform we wished existed.
            </p>
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
                The Problem We Saw
              </span>
              <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk mb-5">
                Access shouldn't be the hardest part of getting well
              </h2>
              <p className="text-ink-600 leading-relaxed text-lg">
                Across all nine provinces, the same pattern repeats: long
                queues at public clinics, private care priced out of reach,
                and rural patients travelling hours for a five-minute
                consultation. We asked what healthcare would look like if
                distance and waiting rooms weren't the bottleneck — and
                started building.
              </p>
            </div>
            <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=900&auto=format&fit=crop"
                alt="Patient consulting a doctor over video call"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our approach */}
      <section className="py-16 md:py-24 bg-surface-soft">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative h-72 md:h-96 rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=900&auto=format&fit=crop"
                alt="Doctor reviewing a patient's digital health record"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="order-1 md:order-2">
              <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
                Our Approach
              </span>
              <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk mb-5">
                Technology that gets out of the way
              </h2>
              <p className="text-ink-600 leading-relaxed text-lg">
                We're not trying to replace doctors with software. The
                platform handles the parts that don't need a clinician —
                booking, records, prescriptions, follow-ups — so the time you
                do get with a real practitioner is spent on care, not admin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
              What We Stand For
            </span>
            <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
              Values that shape every decision
            </h2>
          </div>
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
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 md:py-24 bg-linear-to-br from-primary to-primary-600">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <h2 className="text-2xl md:text-3xl font-medium text-white text-center tracking-tight font-grotesk mb-12">
            The impact so far
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center">
                <Icon className="w-6 h-6 text-white/70 mb-3" />
                <CountUpValue value={value} />
                <p className="text-white/80 text-sm mt-2">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-3">
              Leadership
            </span>
            <h2 className="text-3xl md:text-4xl font-medium text-ink-900 tracking-tight font-grotesk">
              Real people, building this for the long run
            </h2>
          </div>
          <div className="flex justify-center">
            {team.map((member) => (
              <div key={member.name} className="text-center max-w-xs">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold text-2xl font-grotesk">
                    {member.initials}
                  </span>
                </div>
                <p className="font-bold text-ink-900 font-grotesk">{member.name}</p>
                <p className="text-sm text-ink-400">{member.role}</p>
              </div>
            ))}
          </div>
          <blockquote className="mt-14 max-w-2xl mx-auto text-center text-lg md:text-xl text-ink-600 leading-relaxed italic">
            "We're not just building an app – we're reimagining how South
            Africans access healthcare. Join us in making quality care a
            right, not a privilege."
          </blockquote>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-16 md:py-20 bg-surface-soft text-center">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-medium text-ink-900 tracking-tight font-grotesk mb-6">
            See the doctors making this possible
          </h2>
          <Link href="/doctors">
            <Button variant="primary" icon={<ArrowRight size={16} />} iconPosition="right">
              Meet the Doctors
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
