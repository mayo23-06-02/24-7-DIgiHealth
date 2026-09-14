"use client";

import React from "react";
import Link from "next/link";
import SiteHeader from "@/components/LandingPage/SiteHeader";
import Footer from "@/components/LandingPage/Footer";
import type { LegalDoc, LegalBodyBlock } from "@/lib/legal/types";

const LAST_UPDATED = "14 September 2026";

/**
 * A short, unpunctuated line immediately followed by a bullet list reads as
 * a sub-heading in the source documents (e.g. "Personal identification
 * information" introducing the fields under it) — bolded here rather than
 * rendered as an ordinary sentence, since flattening it to plain text loses
 * the grouping that makes these long policies scannable.
 */
function isSubheadingLine(text: string) {
  return text.length < 70 && !/[.:]$/.test(text.trim());
}

function BodyBlocks({ body }: { body: LegalBodyBlock[] }) {
  return (
    <>
      {body.map((block, i) => {
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        const nextIsList = body[i + 1]?.type === "ul";
        if (nextIsList && isSubheadingLine(block.text)) {
          return (
            <p key={i} className="font-bold text-slate-800 pt-1">
              {block.text}
            </p>
          );
        }
        return <p key={i}>{block.text}</p>;
      })}
    </>
  );
}

export default function LegalDocLayout({
  doc,
  backHref = "/register",
  backLabel = "Back to registration",
}: {
  doc: LegalDoc;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <>
      <SiteHeader />
      <main className="bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
            Legal
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 font-grotesk">
            {doc.title}
          </h1>
          <p className="text-sm text-slate-400 mb-8">
            Last updated: {LAST_UPDATED}
          </p>

          {doc.intro.length > 0 && (
            <div className="mb-12 bg-slate-50 border border-slate-100 rounded-lg p-5 space-y-1">
              {doc.intro.map((line, i) => (
                <p key={i} className="text-sm text-slate-600">
                  {line}
                </p>
              ))}
            </div>
          )}

          {doc.sections.map((section, i) => (
            <section key={i} className="mb-10">
              {section.heading && (
                <h2 className="text-xl font-bold text-slate-900 mb-3 font-grotesk">
                  {section.heading}
                </h2>
              )}
              <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
                <BodyBlocks body={section.body} />
              </div>
            </section>
          ))}

          <div className="pt-6 border-t border-slate-100">
            <Link
              href={backHref}
              className="text-sm font-semibold text-primary underline decoration-2 underline-offset-4"
            >
              &larr; {backLabel}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
