"use client";

import React, { useState } from "react";
import Image from "next/image";
import SiteHeader from "@/components/LandingPage/SiteHeader";
import Footer from "@/components/LandingPage/Footer";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  MessageCircle,
  Stethoscope,
  Building2,
  Newspaper,
  Phone,
  Mail,
  Clock,
  Loader2,
  CheckCircle2,
} from "lucide-react";

/**
 * The practitioner inquiry form is hidden for now.
 *
 * A flag rather than deleted or commented out: the form still typechecks and
 * still renders the moment this flips back, so bringing it back is one word
 * rather than a rebuild. Note that its submissions currently 401 — the route
 * itself does no auth, but proxy.ts does not list
 * /api/contact/practitioner-inquiry as public, so anonymous visitors are
 * turned away before reaching it. That needs fixing before this goes live
 * again.
 */
const SHOW_PRACTITIONER_INQUIRY = false;

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    hpcsaNumber: "",
    specialty: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    try {
      const res = await fetch("/api/contact/practitioner-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus("sent");
        setForm({ name: "", email: "", hpcsaNumber: "", specialty: "", message: "" });
      } else {
        setStatus("error");
        setErrorMessage(json.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* Hero */}
      <section className="relative pt-10 pb-16 lg:pt-44 md:pb-20 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?q=80&w=1600&auto=format&fit=crop"
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
              Contact
            </span>
            <h1 className="text-4xl md:text-5xl font-medium text-white leading-[1.1] tracking-tight font-grotesk mb-4">
              Talk to a real person.
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Whatever brought you here, there's a faster way to reach us
              than one generic form.
            </p>
          </div>
        </div>
      </section>

      {/* Routed contact paths */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-20">
            <div className="bg-surface-soft rounded-2xl p-7">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 text-primary shadow-xs">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-ink-900 mb-2 font-grotesk">Patient Support</h3>
              <p className="text-sm text-ink-600 leading-relaxed mb-4">
                Account, billing, or appointment issues.
              </p>
              <a href="mailto:support@247digihealth.com" className="text-primary font-semibold text-sm hover:underline">
                support@247digihealth.com
              </a>
            </div>

            <div className="bg-surface-soft rounded-2xl p-7">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 text-primary shadow-xs">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-ink-900 mb-2 font-grotesk">Practitioner Inquiries</h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Interested in joining as a doctor? Use the form below — it
                goes straight to our clinical onboarding team.
              </p>
            </div>

            <div className="bg-surface-soft rounded-2xl p-7">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 text-primary shadow-xs">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-ink-900 mb-2 font-grotesk">Facility Partnerships</h3>
              <p className="text-sm text-ink-600 leading-relaxed mb-4">
                Hospitals or clinics wanting to integrate with the platform.
              </p>
              <a href="mailto:partnerships@247digihealth.com" className="text-primary font-semibold text-sm hover:underline">
                partnerships@247digihealth.com
              </a>
            </div>

            <div className="bg-surface-soft rounded-2xl p-7">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 text-primary shadow-xs">
                <Newspaper className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-ink-900 mb-2 font-grotesk">Press & Media</h3>
              <p className="text-sm text-ink-600 leading-relaxed mb-4">
                Media inquiries and interview requests.
              </p>
              <a href="mailto:press@247digihealth.com" className="text-primary font-semibold text-sm hover:underline">
                press@247digihealth.com
              </a>
            </div>
          </div>

          {/* Practitioner inquiry form */}
          {SHOW_PRACTITIONER_INQUIRY && (
          <div className="max-w-xl mx-auto bg-white border border-border rounded-2xl p-8">
            <h2 className="text-xl font-bold text-ink-900 mb-1 font-grotesk">
              Practitioner Inquiry
            </h2>
            <p className="text-sm text-ink-400 mb-6">
              We grow our practitioner network directly, one conversation at
              a time. Tell us a bit about yourself and our clinical team
              will follow up.
            </p>

            {status === "sent" ? (
              <div className="flex flex-col items-center text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-success-500 mb-4" />
                <p className="font-bold text-ink-900 font-grotesk mb-1">Inquiry sent</p>
                <p className="text-sm text-ink-600">
                  Our clinical team will be in touch soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                  <Input
                    label="Email address"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                  <Input
                    label="HPCSA number"
                    value={form.hpcsaNumber}
                    onChange={(e) => setForm((p) => ({ ...p, hpcsaNumber: e.target.value }))}
                    required
                  />
                  <Input
                    label="Specialty"
                    value={form.specialty}
                    onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-1.5">
                    Message (optional)
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Anything else we should know?"
                  />
                </div>
                {status === "error" && (
                  <p className="text-sm text-danger-700">{errorMessage}</p>
                )}
                <Button type="submit" variant="primary" fullWidth disabled={status === "sending"}>
                  {status === "sending" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                    </span>
                  ) : (
                    "Send Inquiry"
                  )}
                </Button>
              </form>
            )}
          </div>
          )}
        </div>
      </section>

      {/* Practical details */}
      <section className="py-16 bg-surface-soft">
        <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1400px] xl:max-w-[1400px] 2xl:max-w-[1400px]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
            <div>
              <Phone className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="font-bold text-ink-900 text-sm">Toll Free</p>
              <p className="text-sm text-ink-600">0800 123 4567</p>
            </div>
            <div>
              <Mail className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="font-bold text-ink-900 text-sm">Email</p>
              <p className="text-sm text-ink-600">support@247digihealth.com</p>
            </div>
            <div>
              <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="font-bold text-ink-900 text-sm">Support Hours</p>
              <p className="text-sm text-ink-600">Mon–Fri, 8am–6pm SAST</p>
            </div>
          </div>
          <p className="text-xs text-ink-400 text-center mt-8 max-w-md mx-auto">
            The platform itself is available 24/7 for consultations — live
            human support runs the hours above.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
