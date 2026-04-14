'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { BiFile, BiDownload, BiLoaderAlt, BiNavigation, BiRadar, BiTimeFive, BiCheckCircle } from 'react-icons/bi';

export default function ShiftReports() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchReport();
  }, [date]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/emt/reports/shift?date=${date}`);
      const json = await res.json();
      if (json.success) setReport(json.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><BiLoaderAlt className="text-4xl text-primary animate-spin" /></div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Shift Reports</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Review shift performance & generate audit PDF</p>
        </div>
        <div className="flex gap-4">
           <input 
             type="date" value={date} onChange={e => setDate(e.target.value)}
             className="h-14 bg-slate-800 border-slate-700 border text-white font-bold rounded-2xl px-6 outline-none focus:border-blue-500 transition-all"
           />
           <button className="h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-2xl px-8 flex items-center gap-2 transition-all shadow-xl">
             <BiDownload size={24} /> EXPORT PDF
           </button>
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-800 border-slate-700 p-8 shadow-xl">
               <div className="flex flex-col items-center">
                  <p className="text-5xl font-black text-white mb-2">{report.summary.total}</p>
                  <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Total Dispatches</p>
               </div>
            </Card>
            <Card className="bg-slate-800 border-slate-700 p-8 shadow-xl">
               <div className="flex flex-col items-center">
                  <p className="text-5xl font-black text-emerald-500 mb-2">{report.summary.completed}</p>
                  <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Successful Handoffs</p>
               </div>
            </Card>
            <Card className="bg-slate-800 border-slate-700 p-8 shadow-xl">
               <div className="flex flex-col items-center">
                  <p className="text-5xl font-black text-blue-500 mb-2">{report.summary.totalDistance}<span className="text-xl ml-1 uppercase">KM</span></p>
                  <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Total Distance</p>
               </div>
            </Card>
          </div>

          <div className="space-y-4">
             <h2 className="text-xl font-black text-white uppercase tracking-tight ml-2">Incident Log</h2>
             <div className="grid grid-cols-1 gap-4">
                {report.dispatches.map((d: any) => (
                  <Card key={d._id} className="bg-slate-900/50 border-slate-800 p-0 overflow-hidden">
                     <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800">
                        <div className="p-6 md:w-1/4">
                           <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Time</p>
                           <p className="text-lg font-black text-white">{new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="p-6 flex-1">
                           <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Location / Patient</p>
                           <p className="text-lg font-black text-white uppercase truncate">{d.incidentLocation.address.split(',')[0]}</p>
                           <p className="text-sm font-bold text-slate-500 uppercase">{d.patientId?.firstName} {d.patientId?.lastName}</p>
                        </div>
                        <div className="p-6 md:w-1/4">
                           <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Target Facility</p>
                           <p className="text-lg font-black text-white uppercase truncate">{d.targetFacilityId?.name || 'N/A'}</p>
                        </div>
                        <div className="p-6 md:w-40 flex items-center justify-center bg-slate-800/50">
                           <div className={`flex items-center gap-2 font-black uppercase text-[10px] ${d.status === 'completed' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {d.status === 'completed' ? <BiCheckCircle size={18} /> : <BiRadar size={18} />}
                              {d.status}
                           </div>
                        </div>
                     </div>
                  </Card>
                ))}
             </div>
          </div>
        </>
      )}

      {(!report || report.dispatches.length === 0) && !loading && (
        <div className="h-64 flex flex-col items-center justify-center text-slate-600 gap-4">
           <BiFile size={48} className="opacity-20" />
           <p className="text-xl font-black uppercase">No records for this date</p>
        </div>
      )}
    </div>
  );
}
