"use client";
import React, { useState } from 'react';
import { BsRobot } from 'react-icons/bs';
import AITriageModal from './AITriageModal';

export default function AITriageButton({ showEmergency }: { showEmergency?: () => void }) {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <button 
        aria-label="AI Triage Helper"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-lg bg-trust-blue text-white flex items-center justify-center text-3xl hover:scale-105 transition-transform z-50 animate-pulse-slow font-bold"
      >
        <BsRobot />
      </button>

      <AITriageModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
