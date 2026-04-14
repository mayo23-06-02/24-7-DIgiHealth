'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import KPICard from '@/components/ui/KPICard';
import { 
  BiRadar, BiMap, BiNavigation, BiStats, BiPhone, 
  BiPlusCircle, BiLoaderAlt, BiTimeFive, BiCheckCircle,
  BiUserVoice, BiHistory, BiTargetLock, BiMapAlt,
  BiChevronRight, BiCrosshair, BiPulse, BiShield
} from 'react-icons/bi';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_STEPS = [
  { id: 'pending', label: 'Dispatched', icon: <BiRadar /> },
  { id: 'en_route', label: 'En Route', icon: <BiNavigation /> },
  { id: 'on_scene', label: 'On Scene', icon: <BiMap /> },
  { id: 'transporting', label: 'Transporting', icon: <BiStats /> },
  { id: 'at_facility', label: 'At Facility', icon: <BiCheckCircle /> },
  { id: 'completed', label: 'Completed', icon: <BiCheckCircle /> },
];

export default function EmtDashboard() {
  const [activeDispatch, setActiveDispatch] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    activeEmergencies: 0,
    unitsOnline: 0,
    completedToday: 0,
    avgResponseTime: "0.0m"
  });
  const [responders, setResponders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vitalsForm, setVitalsForm] = useState({ bp: '', hr: '', spo2: '', gcs: 15 });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dispatchRes, statsRes, respondersRes] = await Promise.all([
        fetch('/api/emt/dispatch/active'),
        fetch('/api/emt/stats'),
        fetch('/api/emt/responders')
      ]);

      const [dispatchJson, statsJson, respondersJson] = await Promise.all([
        dispatchRes.json(),
        statsRes.json(),
        respondersRes.json()
      ]);

      if (dispatchJson.success) setActiveDispatch(dispatchJson.data);
      if (statsJson.success) setStats(statsJson.data);
      if (respondersJson.success) setResponders(respondersJson.data);
    } catch (err) {
      console.error("Dashboard poll failed", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!activeDispatch) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/emt/dispatch/${activeDispatch._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) setActiveDispatch(json.data);
      fetchDashboardData();
    } finally {
      setIsUpdating(false);
    }
  };

  const saveVitals = async () => {
    if (!activeDispatch) return;
    try {
      const res = await fetch(`/api/emt/dispatch/${activeDispatch._id}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vitals: vitalsForm }),
      });
      if (res.ok) {
        setVitalsForm({ bp: '', hr: '', spo2: '', gcs: 15 });
      }
    } catch (err) {}
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="animate-spin w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Dispatch Feed...</p>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* KPIs Grid - 2x2 on small, 4x1 on large */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          label="Active Emergencies" 
          value={stats.activeEmergencies} 
          icon={<BiRadar size={24} />} 
          color={stats.activeEmergencies > 0 ? 'primary' : 'slate-800'}
          description="Live Priority Calls"
        />
        <KPICard 
          label="Units Online" 
          value={stats.unitsOnline} 
          icon={<BiUserVoice size={24} />} 
          color="emerald"
          description="Ready for Dispatch"
        />
        <KPICard 
          label="Avg Response" 
          value={stats.avgResponseTime} 
          icon={<BiTimeFive size={24} />} 
          color="primary"
          description="Total Fleet Avg"
        />
        <KPICard 
          label="Calls Resolved" 
          value={stats.completedToday} 
          icon={<BiCheckCircle size={24} />} 
          color="emerald"
          description="Completed Today"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* CENTER: ACTIVE DISPATCH (Main focus) */}
        <div className="xl:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {!activeDispatch ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <Card className="py-24 flex flex-col items-center justify-center gap-6 border-dashed border-2">
                  <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                    <BiRadar size={48} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">System on Standby</h3>
                    <p className="text-sm text-slate-400 font-medium">Monitoring emergency frequency for incoming triggers...</p>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key={activeDispatch._id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Active HUD Card */}
                <Card className="p-8 border-l-4 border-l-rose-500 shadow-xl shadow-slate-200/50">
                   <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
                      <div className="space-y-4">
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit flex items-center gap-2 ${activeDispatch.priority === 'red' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                           <span className={`w-1.5 h-1.5 rounded-full ${activeDispatch.priority === 'red' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                           Priority {activeDispatch.priority} Emergency
                        </div>
                        <h2 className="text-4xl font-extrabold text-slate-900 leading-none tracking-tight uppercase italic underline decoration-rose-500/30 underline-offset-8">
                          Active Dispatch Case
                        </h2>
                        <div className="flex items-start gap-3 mt-4 text-slate-600">
                           <BiMap className="text-primary mt-1" size={20} />
                           <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Incident Location</p>
                              <p className="text-lg font-bold text-slate-800">{activeDispatch.incidentLocation.address}</p>
                           </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center min-w-[160px] border border-slate-100 shadow-inner">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Arrival ETA</span>
                         <p className="text-6xl font-black text-primary tracking-tighter tabular-nums drop-shadow-sm">08<span className="text-xl ml-0.5">m</span></p>
                         <div className="w-full h-1 bg-slate-200 rounded-full mt-4 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} animate={{ width: "70%" }}
                              className="h-full bg-primary" 
                            />
                         </div>
                      </div>
                   </div>

                   {/* Operation Controls HUD */}
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-6 border-t border-slate-100">
                     {STATUS_STEPS.map((step) => {
                       const isActive = activeDispatch.status === step.id;
                       const isCompleted = STATUS_STEPS.findIndex(s => s.id === activeDispatch.status) > STATUS_STEPS.findIndex(s => s.id === step.id);
                       
                       return (
                         <button
                           key={step.id}
                           onClick={() => updateStatus(step.id)}
                           disabled={isUpdating}
                           className={`
                             h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all p-2 border-2
                             ${isActive 
                               ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105' 
                               : isCompleted 
                                 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                 : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 hover:text-slate-600'
                             }
                           `}
                         >
                           <div className="text-2xl">{isActive && isUpdating ? <BiLoaderAlt className="animate-spin" /> : step.icon}</div>
                           <span className="text-[9px] font-black uppercase tracking-tight text-center leading-none px-1">{step.label}</span>
                         </button>
                       );
                     })}
                   </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Subject Details */}
                   <Card className="flex items-center gap-6 p-6">
                      <Avatar name={activeDispatch.patientId?.firstName || 'Unknown'} size="lg" className="ring-4 ring-slate-50 shadow-md" />
                      <div className="flex-1 min-w-0">
                         <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Subject Profile</p>
                         <h3 className="text-2xl font-black text-slate-800 truncate leading-none mb-3">
                           {activeDispatch.patientId ? `${activeDispatch.patientId.firstName} ${activeDispatch.patientId.lastName}` : 'UNIDENTIFIED'}
                         </h3>
                         <div className="flex gap-4">
                            <div className="flex flex-col">
                               <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Blood Detail</span>
                               <span className="text-xs font-black text-slate-700">O+ POSITIVE</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-100 pl-4">
                               <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Critical Alert</span>
                               <span className="text-xs font-black text-rose-500 uppercase">Severe Asthma</span>
                            </div>
                         </div>
                      </div>
                   </Card>

                   {/* Telemetry Entry */}
                   <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                         <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Field Telemetry</h3>
                         <button onClick={saveVitals} className="px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase rounded-lg shadow-xl hover:bg-slate-700 transition-all">
                            Transmit Data
                         </button>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                         {['bp', 'hr', 'spo2', 'gcs'].map((v) => (
                           <div key={v} className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{v}</label>
                              <input 
                                type="text" value={(vitalsForm as any)[v]} 
                                onChange={e => setVitalsForm({...vitalsForm, [v]: e.target.value})}
                                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-2 text-slate-900 font-black text-center focus:border-primary outline-none transition-all shadow-sm" placeholder="--" 
                              />
                           </div>
                         ))}
                      </div>
                   </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tactical Overlay Map (Center or Bottom) */}
          <Card className="p-0 overflow-hidden relative h-[400px] border-2 border-slate-100 shadow-2xl rounded-3xl group">
             {/* Map Controls */}
             <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-10 h-10 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-primary hover:text-white transition-all"><BiCrosshair size={20} /></button>
                <button className="w-10 h-10 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-slate-100 flex items-center justify-center text-slate-800"><BiStats size={20} /></button>
             </div>
             
             {/* Mock Map View */}
             <div className="w-full h-full bg-slate-50 relative pointer-events-none">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#2e3192 1px, transparent 0), linear-gradient(90deg, #2e3192 1px, transparent 0)', backgroundSize: '60px 60px' }} />
                
                {/* Movement Marker */}
                <motion.div 
                   animate={{ x: [0, 100, 200, 100, 0], y: [0, 50, -50, 0] }}
                   transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                   className="absolute top-1/2 left-1/4 w-8 h-8 flex items-center justify-center text-rose-500 z-10"
                >
                   <BiNavigation size={32} className="rotate-45 drop-shadow-lg" />
                   <div className="absolute -inset-4 bg-rose-500/10 rounded-full animate-ping" />
                </motion.div>

                {/* Destination */}
                <div className="absolute top-1/3 right-1/4 flex flex-col items-center gap-2">
                   <div className="w-6 h-6 bg-primary rounded-full ring-8 ring-primary/20 flex items-center justify-center">
                      <BiTargetLock className="text-white" size={14} />
                   </div>
                   <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-slate-100 text-[10px] font-black uppercase text-slate-800">Destination</span>
                </div>

                {/* Scanner pulse */}
                <motion.div 
                   animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute top-1/2 left-1/4 w-12 h-12 border-2 border-rose-500 rounded-full"
                />
             </div>

             <div className="absolute bottom-6 left-6 right-6 z-10">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 p-4 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                         <BiCheckCircle size={22} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Status</p>
                         <h4 className="text-sm font-bold text-slate-800">Tactical Telemetry Sync Active</h4>
                      </div>
                   </div>
                   <div className="flex gap-4 pr-4">
                      <div className="text-right">
                         <p className="text-[9px] font-black text-slate-400 uppercase">Signal</p>
                         <p className="text-xs font-bold text-emerald-500 tracking-tighter">98% STABLE</p>
                      </div>
                   </div>
                </div>
             </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: RESPONDERS & FACILITIES */}
        <div className="xl:col-span-4 space-y-6">
           {/* Responders on Ground */}
           <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-sm font-bold text-slate-800">Nearby Tactical Units</h3>
                 <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg uppercase">Online</span>
              </div>
              <div className="space-y-4">
                 {responders.map((res, i) => (
                   <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-all group">
                      <div className="flex items-center gap-3">
                         <Avatar name={`${res.userId.firstName} ${res.userId.lastName}`} size="md" status="online" className="shadow-sm" />
                         <div>
                            <p className="text-sm font-bold text-slate-800 leading-none mb-1">{res.userId.firstName} {res.userId.lastName.charAt(0)}.</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{res.assignedVehicle || 'Rapid Response'}</p>
                         </div>
                      </div>
                      <button className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-primary hover:text-white transition-all group-hover:shadow-lg group-hover:scale-110">
                         <BiChevronRight size={20} />
                      </button>
                   </div>
                 ))}
                 {responders.length === 0 && (
                   <p className="text-center py-8 text-xs font-bold text-slate-400 italic">No other tactical units identified</p>
                 )}
              </div>
           </Card>

           {/* Priority Facilities */}
           <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-sm font-bold text-slate-800">Nearby Facilities</h3>
                 <BiHistory className="text-slate-400" />
              </div>
              <div className="space-y-4">
                 <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3 relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                       <div>
                          <h4 className="text-sm font-black text-slate-800 uppercase italic">Netcare Milpark</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Primary Trauma Center</p>
                       </div>
                       <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                          <BiShield className="text-primary" />
                       </div>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                       <div className="flex gap-4">
                          <div className="flex flex-col">
                             <span className="text-[9px] text-slate-400 font-bold uppercase">Wait Time</span>
                             <span className="text-xs font-black text-emerald-500 uppercase tracking-tighter">12 Mins</span>
                          </div>
                          <div className="flex flex-col border-l border-slate-200 pl-4">
                             <span className="text-[9px] text-slate-400 font-bold uppercase">Beds Avail</span>
                             <span className="text-xs font-black text-slate-700 tracking-tighter">ICU: 04</span>
                          </div>
                       </div>
                       <Button size="sm" className="h-8 text-[10px] font-black uppercase rounded-xl shadow-lg">NAVIGATE</Button>
                    </div>
                 </div>
              </div>
           </Card>
        </div>

      </div>
    </div>
  );
}
