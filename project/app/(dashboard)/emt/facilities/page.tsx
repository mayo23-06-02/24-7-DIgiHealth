'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { BiNavigation, BiPhone, BiLoaderAlt, BiBed, BiTimeFive, BiRightArrowAlt } from 'react-icons/bi';
import { BsHospital } from 'react-icons/bs';

export default function NearbyFacilities() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const res = await fetch('/api/emt/facilities/nearby');
      const json = await res.json();
      if (json.success) setFacilities(json.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><BiLoaderAlt className="text-4xl text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Nearby Facilities</h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Real-time bed availability & navigation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {facilities.map((facility) => (
          <Card key={facility._id} className="bg-slate-800 border-slate-700 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <BsHospital className="text-blue-500 text-3xl" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white font-mono tracking-tighter">14<span className="text-xs ml-1 text-slate-500">MIN</span></p>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ETA</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-white leading-tight uppercase truncate">{facility.name}</h3>
                <p className="text-sm text-slate-400 line-clamp-1">{facility.address.street}, {facility.address.city}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-4">
                 <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BiBed className="text-emerald-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase">ER Beds</span>
                    </div>
                    <p className="text-xl font-black text-emerald-400">{facility.bedCapacity?.generalAvailable || 0}</p>
                 </div>
                 <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BiTimeFive className="text-amber-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase">Wait Time</span>
                    </div>
                    <p className="text-xl font-black text-amber-400">{facility.currentWaitTimeMins || 20}<span className="text-[10px] ml-1">MINS</span></p>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-700">
               <button className="h-12 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                 <BiNavigation size={16} /> NAVIGATE
               </button>
               <button className="h-12 bg-slate-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                 <BiPhone size={16} /> CALL
               </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
