'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import { BiMapAlt, BiNavigation, BiPlusCircle, BiTargetLock, BiRefresh, BiLayer } from 'react-icons/bi';
import { BsHospital } from 'react-icons/bs';

export default function LiveMap() {
  const [activeMarker, setActiveMarker] = useState<any>(null);

  const mockMarkers = [
    { id: 1, type: 'incident', lat: -26.1076, lng: 28.0567, label: 'TRAUMA INCIDENT', priority: 'RED', wait: '8min' },
    { id: 2, type: 'facility', lat: -26.1200, lng: 28.0600, label: 'MEDICLINIC MORNINGSIDE', beds: '12', wait: '15min' },
    { id: 3, type: 'facility', lat: -26.0900, lng: 28.0300, label: 'NETCARE SUNNINGHILL', beds: '4', wait: '45min' },
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 relative overflow-hidden">
      {/* Tactical Map Interface */}
      <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-700 relative overflow-hidden shadow-2xl">
        {/* Mock Map Background with Grid */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ 
          backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        {/* Navigation Overlays */}
        <div className="absolute top-6 left-6 flex flex-col gap-3">
           <button className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center text-white shadow-xl hover:bg-slate-700 transition-all">
             <BiTargetLock size={28} />
           </button>
           <button className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center text-white shadow-xl hover:bg-slate-700 transition-all">
             <BiLayer size={28} />
           </button>
        </div>

        <div className="absolute top-6 right-6">
           <div className="px-6 py-3 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-2xl flex items-center gap-4 shadow-2xl">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                 <span className="text-xs font-black text-white uppercase tracking-widest">LIVE TRACKING</span>
              </div>
              <div className="w-px h-6 bg-slate-700" />
              <button className="text-slate-400 hover:text-white transition-all">
                <BiRefresh size={24} className="animate-spin-slow" />
              </button>
           </div>
        </div>

        {/* Mock Markers */}
        <div className="absolute inset-0 flex items-center justify-center">
           {/* Center Point (Ambulance) */}
           <div className="relative group cursor-pointer">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg shadow-blue-500/50 animate-pulse" />
              <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] font-black p-2 rounded-lg border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all">
                AMB-123 (CURRENT POSITION)
              </div>
           </div>

           {/* Incident Marker */}
           <div className="absolute transform -translate-x-24 -translate-y-32">
              <div className="relative group cursor-pointer" onClick={() => setActiveMarker(mockMarkers[0])}>
                 <div className="w-10 h-10 bg-red-600 rounded-2xl rotate-45 flex items-center justify-center border-4 border-slate-900 shadow-lg shadow-red-500/50 animate-bounce">
                    <BiPlusCircle className="-rotate-45 text-white" size={20} />
                 </div>
                 <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-red-600 text-[10px] font-black p-2 rounded-lg whitespace-nowrap text-white">
                   INCIDENT #8812
                 </div>
              </div>
           </div>

           {/* Facility Marker */}
           <div className="absolute transform translate-x-40 translate-y-16">
              <div className="relative group cursor-pointer" onClick={() => setActiveMarker(mockMarkers[1])}>
                 <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg shadow-emerald-500/50">
                    <BsHospital className="text-white" size={20} />
                 </div>
                 <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] font-black p-2 rounded-lg border border-slate-700 whitespace-nowrap">
                   MEDICLINIC (12 ER BEDS)
                 </div>
              </div>
           </div>
        </div>

        {/* Bottom Panel - Selection Detail */}
        {activeMarker && (
          <div className="absolute bottom-8 left-8 right-8 animate-slide-up">
            <Card className="bg-slate-800/95 backdrop-blur border-slate-700 p-8 shadow-[0_0_100px_rgba(0,0,0,0.8)] border-t-4 border-t-red-600">
               <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                     <div className={`p-5 rounded-3xl ${activeMarker.type === 'incident' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                        {activeMarker.type === 'incident' ? <BiPlusCircle className="text-white" size={40} /> : <BsHospital className="text-white" size={40} />}
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{activeMarker.type}</p>
                        <h3 className="text-3xl font-black text-white leading-tight">{activeMarker.label}</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mt-1">Status: Active | Est. Arrival: {activeMarker.wait}</p>
                     </div>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                     <button className="flex-1 md:flex-none h-16 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all">
                        <BiNavigation size={24} /> START NAVIGATION
                     </button>
                     <button 
                       onClick={() => setActiveMarker(null)}
                       className="h-16 px-8 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center transition-all"
                     >
                       CLOSE
                     </button>
                  </div>
               </div>
            </Card>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
