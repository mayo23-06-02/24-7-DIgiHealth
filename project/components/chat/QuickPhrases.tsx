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
  disabled = false,
}: {
  onSelect: (phrase: string) => void;
  /** Disable all buttons, e.g. while a previous send is still in flight, to
   *  prevent rapid repeat clicks from firing duplicate sends. */
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-3 mb-2 custom-scrollbar">
      {phrases.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          disabled={disabled}
          className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-xs font-bold whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-all shadow-none disabled:opacity-50 disabled:pointer-events-none"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
