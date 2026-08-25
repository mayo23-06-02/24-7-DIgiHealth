"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/LandingPage/SiteHeader";
import Footer from "@/components/LandingPage/Footer";
import Button from "@/components/ui/Button";
import { Check, ArrowRight } from "lucide-react";
import { TIER_CONFIG, TIER_ORDER } from "@/lib/billing/tiers";
// Shared with the checkout wizard so the plan a visitor reads about here is
// described identically at the point of payment.
import { TIER_COPY } from "@/lib/billing/tierCopy";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* Hero */}
      <section className="relative pt-10 pb-16 lg:pt-20 md:pb-20 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?q=80&w=1600&auto=format&fit=crop"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-ink-900/90 via-ink-900/70 to-ink-900/40" />
        <div className="relative container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="max-w-2xl">
            <span className="text-secondary font-bold tracking-normal text-sm block mb-4">
              Pricing
            </span>
            <h1 className="text-4xl md:text-5xl font-medium text-white leading-[1.1] tracking-tight font-grotesk mb-4">
              Simple pricing, no surprises.
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Every plan includes unlimited chat with your doctor, e-prescriptions,
              and your full digital health record. Medical aid accepted. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {TIER_ORDER.map((tierId) => {
              const tier = TIER_CONFIG[tierId];
              const copy = TIER_COPY[tierId];
              return (
                <div
                  key={tierId}
                  className={`rounded-2xl p-8 flex flex-col h-full ${
                    copy.highlight
                      ? "bg-primary text-white shadow-lg lg:-translate-y-3"
                      : "bg-surface-soft text-ink-900"
                  }`}
                >
                  {copy.highlight && (
                    <span className="text-xs font-bold tracking-wide uppercase bg-white/20 text-white px-3 py-1 rounded-full w-fit mb-4">
                      Most Popular
                    </span>
                  )}
                  <h3 className={`text-xl font-bold font-grotesk mb-1 ${copy.highlight ? "text-white" : "text-ink-900"}`}>
                    {tier.label}
                  </h3>
                  <p className={`text-sm mb-6 ${copy.highlight ? "text-white/80" : "text-ink-600"}`}>
                    {copy.tagline}
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold font-grotesk tabular-nums">
                      R{tier.price}
                    </span>
                    <span className={`text-sm ${copy.highlight ? "text-white/70" : "text-ink-400"}`}>
                      /month
                    </span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {copy.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check
                          size={16}
                          className={`shrink-0 mt-0.5 ${copy.highlight ? "text-white" : "text-primary"}`}
                        />
                        <span className={copy.highlight ? "text-white/90" : "text-ink-600"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button
                      variant={copy.highlight ? "white" : "primary"}
                      fullWidth
                      icon={<ArrowRight size={16} />}
                      iconPosition="right"
                    >
                      Get Started
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ-ish reassurance */}
      <section className="py-16 bg-surface-soft">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <p className="font-bold text-ink-900 text-sm mb-1">Medical aid accepted</p>
              <p className="text-xs text-ink-600">Co-payments handled automatically at checkout.</p>
            </div>
            <div>
              <p className="font-bold text-ink-900 text-sm mb-1">Cancel anytime</p>
              <p className="text-xs text-ink-600">No lock-in contracts, no cancellation fees.</p>
            </div>
            <div>
              <p className="font-bold text-ink-900 text-sm mb-1">Change plans freely</p>
              <p className="text-xs text-ink-600">Upgrade or downgrade as your family's needs change.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
