"use client";
import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiDownload } from 'react-icons/fi';

const mockHistory = [
  { id: 'TX-001', date: '2026-04-01', desc: 'Monthly Subscription', amount: 150, status: 'Paid', method: 'Visa ending 4242' },
  { id: 'TX-002', date: '2026-03-01', desc: 'Monthly Subscription', amount: 150, status: 'Paid', method: 'Visa ending 4242' },
  { id: 'TX-003', date: '2026-02-01', desc: 'Monthly Subscription', amount: 150, status: 'Paid', method: 'Visa ending 4242' },
];

export default function PaymentHistory() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">Payment History</h3>
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-trust-blue hover:bg-slate-100 transition-colors"
        >
          {expanded ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      {/* Render the latest conditionally if collapsed, or map all if expanded */}
      <div className="space-y-4">
        {(expanded ? mockHistory : mockHistory.slice(0, 1)).map((tx, idx) => (
          <div key={tx.id} className={`flex items-center justify-between p-4 rounded-2xl ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white border border-slate-100'}`}>
             <div className="flex flex-col">
               <span className="font-bold text-slate-800">{tx.desc}</span>
               <span className="text-sm font-medium text-slate-500">{new Date(tx.date).toLocaleDateString('en-GB')} • {tx.method}</span>
             </div>
             <div className="flex items-center gap-4">
               <div className="text-right">
                  <span className="block font-bold text-slate-800">R {tx.amount}</span>
                  <span className="text-xs font-bold text-supportive-teal uppercase tracking-widest">{tx.status}</span>
               </div>
               <button aria-label="Download receipt" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-trust-blue hover:border-trust-blue transition-colors shadow-sm hidden sm:flex">
                 <FiDownload />
               </button>
             </div>
          </div>
        ))}
      </div>
      
      {!expanded && (
        <button onClick={() => setExpanded(true)} className="w-full text-center text-sm font-bold text-trust-blue mt-4 underline decoration-transparent hover:decoration-trust-blue transition-all">
          View full history
        </button>
      )}
    </div>
  );
}
