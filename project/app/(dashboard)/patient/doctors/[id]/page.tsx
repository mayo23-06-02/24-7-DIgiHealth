'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BiChevronLeft, BiStar, BiHistory, BiHeart, BiShareAlt, 
  BiCheckCircle, BiVideo, BiMessageDetail, BiMap, BiCalendarActive,
  BiDollar, BiWorld, BiCheckShield
} from 'react-icons/bi';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';

export default function DoctorProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingData, setBookingData] = useState({ date: new Date().toISOString().split('T')[0], time: '', reason: '' });

  useEffect(() => {
    // In real app, fetch by ID. Here we simulate with the available API
    fetch(`/api/practitioners/available`)
      .then(res => res.json())
      .then(data => {
         const found = data.find((d: any) => d.id === id);
         setDoc(found || data[0]); // fallback for demo
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleBooking = async () => {
    try {
      const res = await fetch('/api/consultations/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practitionerId: doc.id,
          ...bookingData,
          type: 'video'
        })
      });
      if (res.ok) {
        setShowBooking(false);
        router.push('/patient/appointment');
      }
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] gap-4">
       <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
       <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Retrieving Encrypted Practitioner Profile...</p>
    </div>
  );

  if (!doc) return <div>Doctor not found.</div>;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* NAVIGATION */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 hover:text-primary transition-all font-black uppercase text-xs tracking-widest group"
      >
         <BiChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
         Back to Discovery
      </button>

      {/* HERO SECTION */}
      <div className="flex flex-col lg:flex-row gap-12 items-start">
         <div className="relative shrink-0">
            <Avatar src={doc.avatar} name={doc.name} size="2xl" status="online" />
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-2">
               <BiStar className="text-amber-400" />
               <span className="text-sm font-black text-slate-800">{doc.rating?.toFixed(1)}</span>
            </div>
         </div>

         <div className="flex-1 space-y-6">
            <div className="space-y-2">
               <h1 className="text-4xl font-black text-slate-800 tracking-tight">{doc.name}</h1>
               <div className="flex items-center gap-3">
                  <Badge label={doc.specialisation} variant="soft" status="info" className="uppercase font-black text-[10px]" />
                  <span className="text-slate-300">|</span>
                  <span className="text-xs font-bold text-slate-400">HPCSA Reg: MP123456</span>
               </div>
            </div>

            <div className="flex flex-wrap gap-8">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Experience</span>
                  <span className="font-bold text-slate-700">{doc.experienceYears}+ Professional Years</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Languages</span>
                  <span className="font-bold text-slate-700">{doc.languages?.join(', ')}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reviews</span>
                  <span className="font-bold text-slate-700">{doc.reviewCount}+ Verified</span>
               </div>
            </div>

            <div className="flex gap-3">
               <Button className="h-14 px-10 shadow-xl shadow-primary/20" onClick={() => setShowBooking(true)}>Book Clinical Session</Button>
               <Button variant="outline" className="h-14 px-8 border-slate-200">
                  <BiHeart size={20} className="mr-2" /> Favourites
               </Button>
               <Button variant="white" className="h-14 w-14 p-0 border-slate-200">
                  <BiShareAlt size={20} />
               </Button>
            </div>
         </div>
      </div>

      {/* DETAIL CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-10">
            {/* BIO */}
            <Card className="p-8 space-y-6" variant="solid">
               <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Professional Biography</h4>
               <p className="text-slate-600 leading-relaxed font-medium">
                  {doc.bio || "Dedicated clinical specialist with a focus on patient-centered outcomes. Extensively trained in advanced diagnostic methodologies and humanitarian clinical practices."}
               </p>
               <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                  <div className="space-y-3">
                     <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Interests</h6>
                     <ul className="space-y-2">
                        {['Preventative Care', 'Diagnostic Excellence', 'Systemic Recovery'].map(item => (
                           <li key={item} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                              <BiCheckCircle className="text-emerald-500" /> {item}
                           </li>
                        ))}
                     </ul>
                  </div>
                  <div className="space-y-3">
                     <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medical Aid Coverage</h6>
                     <div className="flex flex-wrap gap-2">
                        {['Discovery', 'Bonitas', 'Momentum'].map(aid => <Badge key={aid} label={aid} variant="soft" status="success" size="sm" />)}
                     </div>
                  </div>
               </div>
            </Card>

            {/* REVIEWS PREVIEW */}
            <div className="space-y-6">
               <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">Patient Feedback</h4>
               <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Card key={i} className="p-6 border-slate-100" variant="solid">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold">P{i}</div>
                             <div>
                                <p className="text-sm font-black text-slate-800 leading-none mb-1">Verified Patient</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Jan 2026</p>
                             </div>
                          </div>
                          <div className="flex text-amber-400">
                             <BiStar className="fill-current" />
                             <BiStar className="fill-current" />
                             <BiStar className="fill-current" />
                             <BiStar className="fill-current" />
                             <BiStar className="fill-current" />
                          </div>
                       </div>
                       <p className="text-sm text-slate-600 italic">"Extremely professional and attentive. The consultation felt thorough and personal. Highly recommend {doc.name}."</p>
                    </Card>
                  ))}
               </div>
            </div>
         </div>

         {/* SIDEBAR: PRICE & AVAILABILITY */}
         <div className="space-y-6">
            <Card className="p-8 space-y-8 bg-slate-900 text-white border-none shadow-2xl" variant="solid">
               <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Private Consultation Fee</p>
                  <h3 className="text-4xl font-black tracking-tight">R{doc.consultationFee}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 italic">Standard 60-Minute Session</p>
               </div>
               
               <div className="space-y-4 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-4 text-white/80">
                     <BiCheckShield className="text-emerald-400 shrink-0" size={24} />
                     <p className="text-[10px] font-bold uppercase leading-relaxed tracking-tight">
                        Platform Booking Guarantee: Zero hidden costs. Secure payment integration.
                     </p>
                  </div>
                  <Button className="w-full h-14 bg-white text-slate-900 border-none hover:bg-slate-50" onClick={() => setShowBooking(true)}>Instant Booking</Button>
               </div>
            </Card>

            <Card className="p-8 space-y-6" variant="solid">
               <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Next Availability</h4>
               <div className="space-y-3">
                  {doc.availableSlots?.slice(0, 4).map((slot: string) => (
                    <div key={slot} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                       <span className="text-sm font-black text-slate-600">{slot}</span>
                       <Badge label="Confirmed" status="success" variant="soft" className="text-[8px] uppercase font-black" />
                    </div>
                  ))}
               </div>
               <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest cursor-pointer hover:text-primary transition-all">View Full Calendar</p>
            </Card>
         </div>
      </div>

      {/* QUICK BOOK MODAL */}
      <Modal isOpen={showBooking} onClose={() => setShowBooking(false)} title="Clinical Scheduling" width="md">
         <div className="space-y-8">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl">
               <Avatar src={doc.avatar} name={doc.name} size="lg" />
               <div>
                  <h6 className="font-black text-slate-800 leading-none mb-1">{doc.name}</h6>
                  <p className="text-[10px] font-black text-primary uppercase">{doc.specialisation}</p>
               </div>
            </div>

            <div className="space-y-6">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Preferred Date</label>
                  <input 
                    type="date" 
                    className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-none font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 shadow-inner"
                    value={bookingData.date}
                    onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                  />
               </div>

               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Verified Slots</label>
                  <div className="grid grid-cols-4 gap-2">
                     {doc.availableSlots?.map((slot: string) => (
                       <button 
                         key={slot}
                         onClick={() => setBookingData({...bookingData, time: slot})}
                         className={`h-12 rounded-xl text-xs font-black transition-all ${bookingData.time === slot ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-800'}`}
                       >
                          {slot}
                       </button>
                     ))}
                  </div>
               </div>

               <Button 
                 className="w-full h-16 shadow-2xl shadow-primary/30"
                 disabled={!bookingData.time}
                 onClick={handleBooking}
               >
                  Confirm Clinical Session
               </Button>
            </div>
         </div>
      </Modal>
    </div>
  );
}
