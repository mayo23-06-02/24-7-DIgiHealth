"use client";
import React, { useState } from "react";
import { FiChevronDown, FiChevronUp, FiDownload } from "react-icons/fi";
import Button from "../ui/Button";

const mockHistory = [
  {
    id: "TX-001",
    date: "2026-04-01",
    desc: "Monthly Subscription",
    amount: 150,
    status: "Paid",
    method: "Visa ending 4242",
  },
  {
    id: "TX-002",
    date: "2026-03-01",
    desc: "Monthly Subscription",
    amount: 150,
    status: "Paid",
    method: "Visa ending 4242",
  },
  {
    id: "TX-003",
    date: "2026-02-01",
    desc: "Monthly Subscription",
    amount: 150,
    status: "Paid",
    method: "Visa ending 4242",
  },
];

export default function PaymentHistory() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">Payment History</h3>
        <Button
          variant="ghost"
          onClick={() => setExpanded(!expanded)}
          className="w-10 h-10 p-0 rounded-full bg-slate-50 flex items-center justify-center text-primary hover:bg-slate-100 transition-colors border-none bg-transparent !min-w-0"
        >
          {expanded ? <FiChevronUp /> : <FiChevronDown />}
        </Button>
      </div>

      {/* Render the latest conditionally if collapsed, or map all if expanded */}
      <div className="space-y-4">
        {(expanded ? mockHistory : mockHistory.slice(0, 1)).map((tx, idx) => (
          <div
            key={tx.id}
            className={`flex items-center justify-between p-4 rounded-2xl ${idx % 2 === 0 ? "bg-slate-50" : "bg-white border border-slate-100"}`}
          >
            <div className="flex flex-col">
              <span className="font-bold text-slate-800">{tx.desc}</span>
              <span className="text-sm font-medium text-slate-500">
                {new Date(tx.date).toLocaleDateString("en-GB")} • {tx.method}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="block font-bold text-slate-800">
                  R {tx.amount}
                </span>
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-normal">
                  {tx.status}
                </span>
              </div>
              <Button
                variant="ghost"
                aria-label="Download receipt"
                className="w-10 h-10 p-0 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-primary hover:border-primary transition-colors shadow-none hidden sm:flex !min-w-0 bg-transparent"
              >
                <FiDownload />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!expanded && (
        <Button
          variant="ghost"
          onClick={() => setExpanded(true)}
          className="w-full text-center text-sm font-bold text-primary mt-4 underline decoration-transparent hover:decoration-primary transition-all border-none bg-transparent h-auto"
        >
          View full history
        </Button>
      )}
    </div>
  );
}
