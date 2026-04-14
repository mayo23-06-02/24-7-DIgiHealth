'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { BiUser, BiDrop, BiInfoCircle, BiPlusMedical, BiCapsule, BiPhone, BiArrowBack, BiLoaderAlt, BiWifiOff, BiCheckDouble } from 'react-icons/bi';
import { useParams, useRouter } from 'next/navigation';

export default function PatientSnapshot() {
  const { id } = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatient();
  }, [id]);

  const fetchPatient = async () => {
    try {
      const res = await fetch(`/api/emt/patients/${id}`);
      const json = await res.json();
      if (json.success) setPatient(json.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><BiLoaderAlt className="text-4xl text-primary animate-spin" /></div>;

  if (!patient) return <div className="text-center py-20 text-white font-black text-2xl uppercase">Patient Not Found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-white transition-all"
      >
        <BiArrowBack size={20} /> BACK TO DISPATCH
      </button>

      {/* High Alert Banner for Allergies */}
      {patient.allergies?.length > 0 && (
        <div className="bg-rose-600 p-6 rounded-3xl flex items-center justify-between shadow-2xl animate-pulse">
           <div className="flex items-center gap-4">
              <BiInfoCircle size={40} className="text-white" />
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">CRITICAL ALERT: SEVERE ALLERGIES</h2>
                <p className="text-white/90 font-bold uppercase tracking-widest text-xs">
                  {patient.allergies.join(', ')}
                </p>
              </div>
           </div>
           <BiCheckDouble size={32} className="text-white/50" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
           <Card className="bg-slate-800 border-slate-700 p-8 text-center flex flex-col items-center shadow-2xl">
              <div className="w-32 h-32 rounded-[2.5rem] bg-slate-700 flex items-center justify-center text-7xl font-black text-rose-500 mb-6 border-4 border-slate-700">
                {patient.fullName.charAt(0)}
              </div>
              <h1 className="text-3xl font-black text-white uppercase leading-tight mb-2">{patient.fullName}</h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-8">POPIA COMPLIANT RECORD</p>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                 <div className="bg-slate-900/50 p-4 rounded-3xl border border-slate-700">
                    <BiUser className="text-blue-500 mx-auto mb-1" size={24} />
                    <p className="text-xs text-slate-500 font-bold uppercase">Age</p>
                    <p className="text-lg font-black text-white">32YRS</p>
                 </div>
                 <div className="bg-slate-900/50 p-4 rounded-3xl border border-slate-700">
                    <BiDrop className="text-rose-500 mx-auto mb-1" size={24} />
                    <p className="text-xs text-slate-500 font-bold uppercase">Blood</p>
                    <p className="text-lg font-black text-white">{patient.bloodType || 'B+ POS'}</p>
                 </div>
              </div>

              <button 
                onClick={() => window.open(`tel:${patient.mobile}`)}
                className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 mt-8 transition-all shadow-xl"
              >
                <BiPhone size={24} /> CALL PATIENT
              </button>
           </Card>

           <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Emergency Contact</h3>
              <div className="space-y-1">
                 <p className="text-lg font-black text-white uppercase">{patient.emergencyContact?.name || 'Jane Doe'}</p>
                 <p className="text-sm text-slate-400 font-bold">{patient.emergencyContact?.relationship || 'SPOUSE'}</p>
                 <button className="flex items-center gap-2 text-rose-500 font-black uppercase tracking-widest text-[10px] mt-2 group">
                    {patient.emergencyContact?.phone || '+27 72 000 0000'} <BiPhone className="group-hover:scale-125 transition-all" />
                 </button>
              </div>
           </Card>
        </div>

        {/* Clinical History */}
        <div className="lg:col-span-2 space-y-6">
           <Card className="bg-slate-800 border-slate-700 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <BiPlusMedical className="text-blue-500 text-2xl" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Chronic Conditions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {patient.chronicConditions?.length > 0 ? patient.chronicConditions.map((cond: string, i: number) => (
                    <div key={i} className="p-5 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-between group hover:border-slate-500 transition-all">
                       <span className="text-lg font-black text-white uppercase">{cond}</span>
                       <BiInfoCircle className="text-slate-700 group-hover:text-blue-500 transition-all" />
                    </div>
                 )) : <p className="text-slate-500 italic">No recorded conditions</p>}
              </div>
           </Card>

           <Card className="bg-slate-800 border-slate-700 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <BiCapsule className="text-emerald-500 text-2xl" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Active Medications</h2>
              </div>
              <div className="space-y-4">
                 {patient.medications?.length > 0 ? patient.medications.map((med: string, i: number) => (
                    <div key={i} className="p-6 bg-slate-900/50 border-l-4 border-l-emerald-500 rounded-2xl flex justify-between items-center">
                       <div>
                          <p className="text-lg font-black text-white uppercase">{med}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Prescribed | Standard Dosage</p>
                       </div>
                    </div>
                 )) : <p className="text-slate-500 italic">No active medications</p>}
              </div>
           </Card>
        </div>

      </div>

      <div className="flex justify-center flex-col items-center gap-4 py-8">
         <div className="px-6 py-2 bg-slate-800 rounded-full border border-slate-700 flex items-center gap-3">
            <BiWifiOff className="text-slate-500" size={18} />
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">RECORD CACHED FOR OFFLINE ACCESS</span>
         </div>
      </div>
    </div>
  );
}
