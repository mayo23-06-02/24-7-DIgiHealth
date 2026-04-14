'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { BiPackage, BiCheckCircle, BiXCircle, BiSave, BiLoaderAlt, BiRefresh } from 'react-icons/bi';

const DEFAULT_ITEMS = [
  'Automatic External Defibrillator (AED)',
  'Oxygen Cylinder (Main & Portable)',
  'Advanced Airway Kit (Intubation/BVM)',
  'Suction Unit (Electric & Manual)',
  'Emergency Drug Kit (ALS)',
  'IV Therapy Supplies',
  'Trauma Dressing Kit',
  'Burn Treatment Kit',
  'Spinal Immobilization (Board/Collars)',
  'Obstetric (OB) Kit',
  'Pulse Oximeter & Monitor',
  'Sphygmomanometer (Manual & Digital)'
];

export default function EquipmentChecklist() {
  const [items, setItems] = useState<{item: string, status: boolean}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize with default items
    setItems(DEFAULT_ITEMS.map(i => ({ item: i, status: true })));
    setLoading(false);
  }, []);

  const toggleStatus = (index: number) => {
    const newItems = [...items];
    newItems[index].status = !newItems[index].status;
    setItems(newItems);
  };

  const saveChecklist = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/emt/equipment/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      alert('Checklist Saved Successfully');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><BiLoaderAlt className="text-4xl text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Equipment Inventory</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Pre-shift vehicle check | AMB-123</p>
        </div>
        <button 
          onClick={saveChecklist}
          disabled={isSaving}
          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl disabled:opacity-50"
        >
          {isSaving ? <BiLoaderAlt className="animate-spin" /> : <BiSave size={24} />}
          SAVE CHECK
        </button>
      </div>

      <Card className="bg-slate-800 border-slate-700 p-0 overflow-hidden shadow-2xl">
        <div className="divide-y divide-slate-700">
          {items.map((check, idx) => (
            <button 
              key={idx}
              onClick={() => toggleStatus(idx)}
              className="w-full h-20 flex items-center justify-between px-8 hover:bg-slate-700/50 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${check.status ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                   {check.status ? <BiCheckCircle size={24} /> : <BiXCircle size={24} />}
                </div>
                <span className={`text-lg font-bold tracking-tight ${check.status ? 'text-white' : 'text-rose-500'}`}>{check.item}</span>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${check.status ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                {check.status ? 'Functional' : 'Repair / Empty'}
              </div>
            </button>
          ))}
        </div>
      </Card>
      
      <div className="flex justify-center pt-6">
         <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <BiRefresh size={14} className="animate-spin" /> Auto-syncing with Dispatch Center
         </p>
      </div>
    </div>
  );
}
