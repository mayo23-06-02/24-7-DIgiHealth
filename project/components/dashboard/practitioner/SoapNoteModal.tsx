'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BiX, BiSave, BiLoader, BiCheckCircle, BiNote } from 'react-icons/bi';

interface SoapNotes {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

interface SoapNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  patientName: string;
  existingNotes?: SoapNotes;
}

type ToastState = { type: 'success' | 'error'; message: string } | null;

const FIELDS: { key: keyof SoapNotes; label: string; abbr: string; hint: string; color: string }[] = [
  {
    key: 'subjective',
    label: 'Subjective',
    abbr: 'S',
    hint: "Patient's own description — symptoms, history, concerns",
    color: 'text-[#0052CC] bg-blue-50 border-blue-100',
  },
  {
    key: 'objective',
    label: 'Objective',
    abbr: 'O',
    hint: 'Measurable findings — vitals, exam results, labs',
    color: 'text-[#00A3BF] bg-teal-50 border-teal-100',
  },
  {
    key: 'assessment',
    label: 'Assessment',
    abbr: 'A',
    hint: 'Diagnosis and clinical impression — differential diagnoses',
    color: 'text-purple-600 bg-purple-50 border-purple-100',
  },
  {
    key: 'plan',
    label: 'Plan',
    abbr: 'P',
    hint: 'Treatment plan — medications, follow-up, referrals, instructions',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
];

export default function SoapNoteModal({
  isOpen,
  onClose,
  consultationId,
  patientName,
  existingNotes,
}: SoapNoteModalProps) {
  const [notes, setNotes] = useState<SoapNotes>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && existingNotes) {
      setNotes({
        subjective: existingNotes.subjective || '',
        objective: existingNotes.objective || '',
        assessment: existingNotes.assessment || '',
        plan: existingNotes.plan || '',
      });
    }
  }, [isOpen, existingNotes]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, notes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/practitioner/consultations/${consultationId}/soap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notes),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: 'SOAP note saved successfully' });
        setTimeout(() => { setToast(null); onClose(); }, 1800);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to save note. Please retry.' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const charCount = Object.values(notes).join('').length;
  const isComplete = FIELDS.every((f) => (notes[f.key] || '').trim().length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-400">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#0052CC]/5 to-[#00A3BF]/5 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0052CC] to-[#00A3BF] flex items-center justify-center shadow-md shadow-blue-300">
            <BiNote className="text-white text-lg" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black text-slate-800">SOAP Note</h2>
            <p className="text-xs text-slate-500">
              {patientName} · {charCount > 0 ? `${charCount} chars` : 'Start typing…'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isComplete && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full flex items-center gap-1">
                <BiCheckCircle size={10} /> Complete
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all active:scale-95"
            >
              <BiX size={18} />
            </button>
          </div>
        </div>

        {/* SOAP Fields */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`
                    w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center border
                    ${field.color}
                  `}
                >
                  {field.abbr}
                </span>
                <label className="text-sm font-bold text-slate-700">{field.label}</label>
                <span className="text-[10px] text-slate-400 ml-1 hidden sm:block">{field.hint}</span>
              </div>
              <textarea
                value={notes[field.key] || ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.hint}
                rows={3}
                className="w-full text-sm px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-300 outline-none focus:border-[#0052CC]/30 focus:bg-white focus:shadow-lg focus:shadow-blue-50 transition-all resize-none leading-relaxed"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0 bg-white">
          <p className="text-[10px] text-slate-400">
            <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">Ctrl+S</kbd> to save
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#0052CC] hover:bg-[#0047B3] active:scale-[0.98] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-300"
            >
              {saving ? (
                <BiLoader className="animate-spin" size={16} />
              ) : (
                <BiSave size={16} />
              )}
              {saving ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`
              absolute bottom-20 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl
              animate-in slide-in-from-bottom-4 zoom-in-95 duration-300
              ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}
            `}
          >
            {toast.type === 'success' ? '✅ ' : '❌ '}{toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
