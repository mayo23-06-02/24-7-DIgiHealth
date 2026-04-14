'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { BiHistory, BiChevronRight, BiLoaderAlt, BiExpand, BiFile, BiFilterAlt } from 'react-icons/bi';

export default function DispatchHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/emt/dispatch/history');
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><BiLoaderAlt className="text-4xl text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white">DISPATCH HISTORY</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Review past incidents and patient outcomes</p>
        </div>
        <button className="p-3 bg-slate-800 border border-slate-700 rounded-2xl text-white hover:bg-slate-700 transition-all">
          <BiFilterAlt size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {history.map((item) => (
          <Card key={item._id} className="bg-slate-800 border-slate-700 hover:border-slate-500 transition-all p-0 overflow-hidden cursor-pointer group">
            <div className="flex flex-col md:flex-row items-stretch">
              <div className={`w-1.5 ${item.priority === 'red' ? 'bg-rose-500' : item.priority === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString()}</p>
                  <p className="text-lg font-black text-white uppercase">{item.incidentLocation.address.split(',')[0]}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient</p>
                  <p className="text-sm font-bold text-white uppercase">{item.patientId ? `${item.patientId.firstName} ${item.patientId.lastName}` : 'Anonymous'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Facility</p>
                  <p className="text-sm font-bold text-white uppercase truncate">{item.targetFacilityId?.name || 'N/A'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                    {item.status}
                  </div>
                  <BiExpand className="text-slate-600 group-hover:text-white transition-all" size={20} />
                </div>
              </div>
            </div>
          </Card>
        ))}

        {history.length === 0 && (
          <div className="h-[40vh] flex flex-col items-center justify-center text-slate-500 gap-4">
            <BiHistory size={64} className="opacity-20" />
            <p className="text-lg font-medium">No historical records found</p>
          </div>
        )}
      </div>
    </div>
  );
}
