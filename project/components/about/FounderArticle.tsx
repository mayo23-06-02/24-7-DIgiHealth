"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Clock, ExternalLink, X } from "lucide-react";

type Block = { p: string } | { list: string[] };

/** Amanda Mazwi's article, as published on the Digital Vantage Solutions site. */
const ARTICLE = {
  title: "Digital Transformation in Healthcare: Building Smarter Patient-Centric Health Systems",
  author: "Amanda Mazwi",
  authorRole: "Director — Digital Vantage Solutions",
  publisher: "Digital Vantage Solutions",
  date: "20 May 2025",
  url: "https://www.digitalvantagesolutions.co.za/article-healthcare-digital-transformation.html",
  body: [
    {
      p: "Healthcare systems across Africa are undergoing significant pressure to improve efficiency, accessibility, patient experience, and operational sustainability.",
    },
    { p: "Many healthcare institutions continue to face challenges that include:" },
    {
      list: [
        "Manual patient administration",
        "Fragmented clinical systems",
        "Long patient waiting times",
        "Limited visibility across departments",
        "Revenue collection inefficiencies",
        "Paper-based workflows",
        "Slow reporting cycles",
        "Capacity management challenges",
      ],
    },
    { p: "While these challenges are operational in nature, their impact is ultimately experienced by patients." },
    {
      p: "At Digital Vantage Solutions, we believe healthcare digital transformation should focus not only on technology modernisation, but on improving the overall patient journey.",
    },
    { p: "Modern healthcare platforms create opportunities to connect multiple operational functions into one intelligent ecosystem." },
    { p: "This includes:" },
    {
      list: [
        "Patient registration and admissions",
        "Appointment scheduling",
        "Triage workflows",
        "Electronic medical records",
        "Pharmacy and dispensary management",
        "Billing and payment processing",
        "Claims administration",
        "Queue management",
        "Reporting and analytics",
        "Mobile patient communication platforms",
      ],
    },
    { p: "Integrated digital systems improve both operational visibility and patient experience." },
    {
      p: "For healthcare administrators, digital platforms provide real-time oversight into resource allocation, service demand, operational bottlenecks, and revenue management performance.",
    },
    { p: "For patients, digital engagement platforms create more convenient and transparent healthcare experiences through:" },
    {
      list: [
        "Online bookings",
        "SMS and email notifications",
        "Digital payment channels",
        "Faster admissions",
        "Reduced paperwork",
        "Better communication",
        "Improved access to healthcare information",
      ],
    },
    { p: "Importantly, healthcare digital transformation also supports better clinical outcomes." },
    {
      p: "When information flows efficiently between departments, healthcare professionals can make faster and more informed decisions. Automation reduces administrative burdens on clinical staff, allowing greater focus on patient care.",
    },
    { p: "Africa’s healthcare sector presents enormous digital transformation opportunities." },
    {
      p: "Growing populations, urbanisation, increased smartphone penetration, and expanding healthcare infrastructure investments create an environment where digital platforms can significantly improve healthcare accessibility and efficiency.",
    },
    { p: "However, digital transformation in healthcare must be approached strategically." },
    { p: "Healthcare platforms must prioritise:" },
    {
      list: [
        "Security and patient confidentiality",
        "System reliability",
        "Scalability",
        "Compliance and governance",
        "Interoperability between systems",
        "User adoption and training",
      ],
    },
    { p: "Technology should support healthcare professionals — not complicate their work." },
    {
      p: "At Digital Vantage Solutions, we see healthcare technology as an enabler of smarter operations, improved patient engagement, and sustainable healthcare delivery.",
    },
    {
      p: "The healthcare organisations that invest in intelligent digital ecosystems today will be better equipped to serve the growing demands of tomorrow.",
    },
    { p: "Digital healthcare is no longer a future concept." },
    { p: "It is rapidly becoming a strategic necessity." },
  ] as Block[],
};

/** Reading time at 200 words a minute, rounded to the nearest half minute. */
function readMinutes(blocks: Block[]): string {
  const words = blocks
    .flatMap((b) => ("p" in b ? [b.p] : b.list))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const mins = Math.max(0.5, Math.round((words / 200) * 2) / 2);
  return `${String(mins).replace(".", ",")} min read`;
}

const READ_TIME = readMinutes(ARTICLE.body);
const firstParagraph = (ARTICLE.body[0] as { p: string }).p;

/**
 * About page leadership block: the founder's article teaser on the left, her
 * portrait on the right. "Read more" opens the full article in a modal.
 */
export default function FounderArticle() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <article className="order-2 lg:order-1">
          <p className="text-sm font-semibold text-secondary mb-3">
            {ARTICLE.publisher} · {ARTICLE.date}
          </p>
          <h3 className="text-2xl md:text-3xl font-medium text-ink-900 tracking-tight font-grotesk leading-snug">
            {ARTICLE.title}
          </h3>
          <p className="mt-3 text-sm text-ink-400">
            By <span className="font-semibold text-ink-700">{ARTICLE.author}</span>, {ARTICLE.authorRole}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-400">
            <Clock size={14} /> {READ_TIME}
          </p>
          <p className="mt-6 text-ink-600 leading-relaxed text-base md:text-lg">{firstParagraph}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary/90 transition"
            >
              Read more <ArrowRight size={16} />
            </button>
            <a
              href={ARTICLE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Visit Digital Vantage Solutions <ExternalLink size={14} />
            </a>
          </div>
        </article>

        <figure className="order-1 lg:order-2 lg:w-4/5 lg:ml-auto">
          <Image
            src="/about/amanda-mazwi.jpg"
            width={1086}
            height={1448}
            sizes="(min-width: 1024px) 40vw, 100vw"
            alt="Amanda Mazwi, founder of 24/7 DigiMedCare"
            className="w-full h-auto rounded-2xl shadow-sm"
            priority
          />
          <figcaption className="mt-4 text-center lg:text-left">
            <span className="block font-bold text-ink-900 font-grotesk">{ARTICLE.author}</span>
            <span className="text-sm text-ink-400">Founder</span>
          </figcaption>
        </figure>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="founder-article-title"
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold text-secondary">
                  {ARTICLE.publisher} · {ARTICLE.date} · {READ_TIME}
                </p>
                <h3 id="founder-article-title" className="mt-1 text-lg md:text-xl font-bold text-ink-900 font-grotesk leading-snug">
                  {ARTICLE.title}
                </h3>
                <p className="mt-1 text-sm text-ink-400">
                  By {ARTICLE.author}, {ARTICLE.authorRole}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close article"
                className="shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-6 space-y-4 text-ink-600 leading-relaxed">
              {ARTICLE.body.map((b, i) =>
                "p" in b ? (
                  <p key={i}>{b.p}</p>
                ) : (
                  <ul key={i} className="list-disc space-y-1 pl-6">
                    {b.list.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                ),
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <a
                href={ARTICLE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Read on digitalvantagesolutions.co.za <ExternalLink size={14} />
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
