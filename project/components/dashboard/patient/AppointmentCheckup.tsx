"use client";

import React from "react";
import { BiChevronLeft, BiChevronRight, BiChevronDown, BiPulse, BiDotsVerticalRounded } from "react-icons/bi";

export default function AppointmentCheckup() {
  const appointments = [
    { dr: "Dr. Dianne Russell", field: "Cardiologist", time: "10.00 AM", img: "https://i.pravatar.cc/150?u=1", concern: "Persistent chest discomfort and irregular heartbeats frequently." },
    { dr: "Dr. Devon Lane", field: "Optometry", time: "2.00 PM", img: "https://i.pravatar.cc/150?u=2", concern: "Vision blurring and light sensitivity during work hours." },
    { dr: "Dr. Kathryn Murphy", field: "Cardiologist", time: "8.00 PM", img: "https://i.pravatar.cc/150?u=3", concern: "Routine hypertension screening and medication refill sync." }
  ];

  return (
    <div className="space-y-8 flex-1">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">Regular Checkup Schedule</h2>
            <div className="flex items-center gap-2 text-primary font-black text-sm cursor-pointer hover:underline bg-primary/5 px-4 py-2 rounded-lg">
               Sept 2024 <BiChevronDown />
            </div>
         </div>
         <div className="flex gap-3">
            <button className="w-12 h-12 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"><BiChevronLeft size={24} /></button>
            <button className="w-12 h-12 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"><BiChevronRight size={24} /></button>
         </div>
      </div>

      {/* Date scroller */}
      <div className="flex gap-4 pb-4 overflow-x-auto custom-scrollbar no-scrollbar scroll-smooth">
         {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((d, i) => (
           <div key={d} className={`min-w-[120px] p-6 text-center rounded-lg border transition-all cursor-pointer group ${i === 4 ? 'bg-primary border-primary text-white' : 'bg-white border-slate-50 text-slate-400 hover:border-primary/30 hover:text-slate-800'}`}>
              <p className={`text-[10px] font-black uppercase mb-3 tracking-widest ${i === 4 ? 'text-white/60' : 'text-slate-300 group-hover:text-primary/50'}`}>{['FRI', 'SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i]}</p>
              <p className="text-3xl font-black leading-none">{d < 10 ? `0${d}` : d}</p>
           </div>
         ))}
      </div>

      {/* Appointment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
         {appointments.map(appt => (
            <div key={appt.dr} className="group bg-white rounded-lg p-10 border border-slate-50 relative pt-14 overflow-hidden hover:translate-y-[-4px] transition-all duration-500">
               <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity"><BiDotsVerticalRounded className="text-slate-300 cursor-pointer text-2xl" /></div>
               
               <div className="flex items-center gap-6 mb-8 relative">
                  <div className="relative shrink-0">
                     <img src={appt.img} alt={appt.dr} className="w-20 h-20 rounded-lg object-cover transition-transform duration-500" />
                     <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-lg flex items-center justify-center text-white text-[10px] font-black transition-transform group-hover:scale-110">✓</div>
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800 leading-tight mb-1 group-hover:text-primary transition-colors">{appt.dr}</h4>
                    <div className="flex items-center gap-2 mb-2">
                       <BiPulse className="text-rose-500 animate-pulse" />
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{appt.field}</span>
                    </div>
                    <p className="text-[11px] font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg inline-block">Appointment: {appt.time}</p>
                  </div>
               </div>
               
               <p className="text-[13px] text-slate-400 font-bold mb-10 leading-relaxed italic line-clamp-2 group-hover:text-slate-600 transition-colors">"{appt.concern}"</p>
               
               <button className="w-full py-5 bg-primary/5 text-primary border-2 border-primary/10 rounded-lg font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 active:scale-95">
                  <img src="https://www.gstatic.com/images/branding/product/1x/meet_2020q4_48dp.png" className="w-6 h-6 opacity-80 group-hover:brightness-0 group-hover:invert transition-all" /> 
                  Launch Virtual Link
               </button>
            </div>
         ))}
      </div>
    </div>
  );
}
