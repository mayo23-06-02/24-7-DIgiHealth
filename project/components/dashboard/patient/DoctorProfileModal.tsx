"use client";

import React, { useState } from "react";
import {
  BiX, BiShareAlt, BiStar, BiPhone, BiEnvelope,
  BiBuilding, BiMessage, BiCalendar, BiCheckCircle,
  BiShieldQuarter, BiGlobe, BiWallet, BiAward, BiChevronRight, BiHeart, BiSolidHeart
} from "react-icons/bi";

export interface DoctorProfile {
  id: string;
  name: string;
  specialisation: string;
  hpcsNumber: string;
  experienceYears: number;
  languages: string[];
  practicePhone: string;
  practiceEmail: string;
  facilityName: string;
  facilityId: string;
  about: string;
  clinicalInterests: string[];
  consultationFee: number;
  acceptsMedicalAid: string[];
  rating: number;
  reviewCount: number;
  isOnline: boolean;
  avatarUrl?: string;
  nextAvailableMinutes?: number;
}

interface DoctorProfileModalProps {
  doctor: DoctorProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onBook: (doctorId: string, slot?: string) => void;
  onMessage: (doctorId: string) => void;
}

export default function DoctorProfileModal({ doctor, isOpen, onClose, onBook, onMessage }: DoctorProfileModalProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  if (!isOpen || !doctor) return null;

  // Mock available slots for today
  const availableSlots = ["10:00 AM", "10:30 AM", "11:00 AM", "02:00 PM", "02:30 PM", "04:00 PM"];

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-6 transition-all">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-t-lg md:rounded-lg w-full max-w-2xl max-h-[95vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-90"
          >
            <BiX size={28} />
          </button>
          
          <div className="flex flex-col items-center">
            <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none mb-1">Dr. {doctor.name}</h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{doctor.specialisation}</p>
          </div>

          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-90" aria-label="Share">
              <BiShareAlt size={20} />
            </button>
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`w-10 h-10 rounded-lg hover:bg-slate-50 flex items-center justify-center transition-all active:scale-90 ${isSaved ? "text-rose-500 scale-110" : "text-slate-400"}`}
              aria-label="Save doctor"
            >
              {isSaved ? <BiSolidHeart size={22} /> : <BiHeart size={22} />}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          
          {/* Hero Section */}
          <section className="text-center relative">
            <div className="relative inline-block">
                <div className="w-28 h-28 rounded-lg bg-slate-100 mx-auto overflow-hidden ring-8 ring-slate-50">
                {doctor.avatarUrl ? (
                    <img src={doctor.avatarUrl} alt={doctor.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary text-4xl font-black">
                    {doctor.name.charAt(0)}
                    </div>
                )}
                </div>
                {doctor.isOnline && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ring-4 ring-white">
                        <span className="w-1.5 h-1.5 bg-white rounded-lg animate-pulse" />
                        Online Now
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-center items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                    <BiStar className="text-amber-500 fill-amber-500" size={18} />
                    <span className="font-black text-slate-800">{doctor.rating}</span>
                </div>
                <div className="h-6 w-px bg-slate-100" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{doctor.reviewCount} Reviews</span>
            </div>
          </section>

          {/* Core Info Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-primary">
                      <BiShieldQuarter size={24} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HPCSA Registration</p>
                      <p className="text-sm font-black text-slate-800 font-mono">{doctor.hpcsNumber}</p>
                  </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-primary">
                      <BiAward size={24} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Experience</p>
                      <p className="text-sm font-black text-slate-800">{doctor.experienceYears}+ Professional Years</p>
                  </div>
              </div>
          </section>

          {/* Contact & Facility */}
          <section className="space-y-3 bg-white border border-slate-100 rounded-lg p-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Contact & Practice</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href={`tel:${doctor.practicePhone}`} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                        <BiPhone size={20} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{doctor.practicePhone}</span>
                </a>
                <a href={`mailto:${doctor.practiceEmail}`} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                        <BiEnvelope size={20} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors truncate">{doctor.practiceEmail}</span>
                </a>
                <button className="flex items-center gap-4 group text-left col-span-1 md:col-span-2">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                        <BiBuilding size={20} />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{doctor.facilityName}</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">View Facility Profile <BiChevronRight className="inline" /></p>
                    </div>
                </button>
                <div className="flex items-center gap-4 group col-span-1 md:col-span-2">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <BiGlobe size={20} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{doctor.languages.join(", ")}</span>
                </div>
            </div>
          </section>

          {/* About & Clinical Focus */}
          <section className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Professional Bio</h3>
              <p className="text-slate-600 text-sm leading-relaxed font-medium bg-slate-50/50 p-6 rounded-lg border border-dashed border-slate-200">{doctor.about}</p>
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Clinical Interests</h3>
              <div className="flex flex-wrap gap-2">
                {doctor.clinicalInterests.map((interest) => (
                  <span key={interest} className="bg-primary/5 text-primary px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-tight border border-primary/10">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Consultation Fee */}
          <section className="bg-slate-900 rounded-lg p-6 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-lg -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/40 transition-all duration-700" />
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">Private Consultation</h3>
                <p className="text-xs text-white/70 font-bold mb-4">Discovery, Momentum & Medical Aids Accepted</p>
                <div className="flex flex-wrap gap-1.5">
                    {doctor.acceptsMedicalAid.slice(0, 3).map(aid => (
                        <span key={aid} className="text-[9px] font-black px-2 py-0.5 bg-white/10 rounded-lg">{aid}</span>
                    ))}
                </div>
              </div>
              <div className="text-right">
                <BiWallet className="inline-block text-primary mb-2" size={24} />
                <p className="text-3xl font-black text-white leading-none">R{doctor.consultationFee}</p>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-2">Per 20min Session</p>
              </div>
            </div>
          </section>

          {/* Availability Calendar */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <BiCalendar className="text-primary" /> Availability Slots
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Timezone: Africa/Johannesburg</span>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Today, 15 April</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-4 py-3 rounded-lg text-[11px] font-black transition-all duration-300 transform active:scale-95 ${
                      selectedSlot === slot
                        ? "bg-primary text-white"
                        : "bg-white border border-slate-100 text-slate-700 hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Reviews Preview */}
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Patient Feedback</h3>
              <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">View all {doctor.reviewCount} Reviews</button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white border border-slate-100 p-5 rounded-lg relative group overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform" />
                <div className="flex items-center gap-1.5 text-amber-400 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <BiStar key={i} size={14} fill="currentColor" />
                  ))}
                  <span className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-tighter">Verified Visit</span>
                </div>
                <p className="text-sm text-slate-600 font-bold leading-relaxed mb-3 italic">"Very thorough and caring \u2013 explained everything in a way I could actually understand. Dr. {doctor.name} is now our family's primary go-to."</p>
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Thandiwe M. \u00b7 2 days ago</p>
                    <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                        <BiCheckCircle size={14} /> Recommended
                    </div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 p-5 rounded-lg relative group overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 transform -translate-x-full group-hover:translate-x-0 transition-transform" />
                <div className="flex items-center gap-1.5 text-amber-400 mb-2">
                  {[...Array(4)].map((_, i) => (
                    <BiStar key={i} size={14} fill="currentColor" />
                  ))}
                  <BiStar size={14} className="text-slate-200" />
                </div>
                <p className="text-sm text-slate-600 font-bold leading-relaxed mb-3 italic">"Great consultation, very professional. Only small delay (waited about 10 minutes past my slot) but highly recommended."</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">John D. \u00b7 1 week ago</p>
              </div>
            </div>
          </section>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-6 flex gap-4">
          <button
            onClick={() => onMessage(doctor.id)}
            className="flex items-center justify-center w-14 h-14 rounded-lg border border-slate-100 text-slate-400 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all active:scale-95"
          >
            <BiMessage size={24} />
          </button>
          <button
            disabled={!selectedSlot}
            onClick={() => onBook(doctor.id, selectedSlot || undefined)}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-lg font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] ${
                selectedSlot 
                ? "bg-primary text-white hover:bg-primary-dark" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <BiCalendar size={20} /> 
            {selectedSlot ? `Confirm Booking For ${selectedSlot}` : "Select a Time Slot"}
          </button>
        </div>
      </div>
    </div>
  );
}
