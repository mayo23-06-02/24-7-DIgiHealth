import React from "react";

const phrases = [
  "I need a prescription refill.",
  "My symptoms have worsened.",
  "I have a new symptom:",
  "When is my next appointment?",
  "Can you explain the medication side effects?",
];

export default function QuickPhrases({
  onSelect,
}: {
  onSelect: (phrase: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-3 mb-2 custom-scrollbar">
      {phrases.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-xs font-bold whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-all shadow-none"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
