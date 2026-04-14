'use client';

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  BiSearch, BiFilterAlt, BiStar, BiChevronRight, BiTime, 
  BiVideo, BiMessageDetail, BiMap, BiX, BiSliderAlt,
  BiCheckCircle, BiHeart, BiShareAlt, BiDollar, BiWorld,
  BiMaleFemale, BiHistory, BiTrash, BiCheck, BiUser
} from "react-icons/bi";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";

const SPECIALISATIONS = ['All', 'General Practitioner', 'Cardiologist', 'Paediatrician', 'Dermatologist', 'Psychiatrist', 'Gynaecologist'];
const LANGUAGES = ['All', 'English', 'isiZulu', 'Afrikaans', 'Xhosa', 'French'];
const MEDICAL_AIDS = ['All', 'Discovery', 'Momentum', 'Bonitas', 'Medihelp'];

const PractitionerDiscovery: React.FC = () => {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setFilters] = useState({
     specialisation: 'All',
     language: 'All',
     maxPrice: 1000,
     gender: 'Any'
  });
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [bookingData, setBookingData] = useState({ date: new Date().toISOString().split('T')[0], time: '', reason: '' });
  const [sortBy, setSortBy] = useState("rating");

  useEffect(() => {
    fetchDoctors();
  }, [activeFilters, searchQuery, sortBy]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        specialisation: activeFilters.specialisation,
        languages: activeFilters.language,
        maxPrice: activeFilters.maxPrice.toString(),
        gender: activeFilters.gender,
        search: searchQuery,
        sortBy: sortBy
      });
      const res = await fetch(`/api/practitioners/available?${params.toString()}`);
      const data = await res.json();
      setDoctors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavourite = (id: string) => {
    setFavourites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBooking = async () => {
    if (!selectedDoc || !bookingData.time) return;
    try {
       const res = await fetch('/api/consultations/book', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           practitionerId: selectedDoc.id,
           date: bookingData.date,
           time: bookingData.time,
           type: 'video',
           chiefComplaint: bookingData.reason || 'Medical Discovery Session'
         })
       });
       if (res.ok) {
         setShowBooking(false);
         alert("Appointment Booked Successfully!");
       }
    } catch (err) { console.error(err); }
  };

  const SkeletonCard = () => (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 animate-pulse space-y-6">
       <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl" />
          <div className="flex-1 space-y-2">
             <div className="h-4 bg-slate-100 rounded w-3/4" />
             <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
       </div>
       <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-slate-50 rounded-xl" />
          <div className="h-10 bg-slate-50 rounded-xl" />
       </div>
       <div className="h-12 bg-slate-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-[1600px] mx-auto px-6 py-10">
      
      {/* FILTER SIDEBAR */}
      <aside className="lg:w-80 shrink-0 space-y-8 animate-in slide-in-from-left duration-700">
         <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Find a Doctor</h2>
            <p className="text-slate-500 font-medium">Verified medical network.</p>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Search</label>
               <div className="relative">
                  <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name..."
                    className="w-full h-12 pl-10 pr-4 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specialisation</label>
               <div className="space-y-2">
                  {SPECIALISATIONS.map(s => (
                    <button 
                      key={s} 
                      onClick={() => setFilters({...activeFilters, specialisation: s})}
                      className={`w-full text-left px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeFilters.specialisation === s ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                       {s}
                    </button>
                  ))}
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Range (R{activeFilters.maxPrice})</label>
               <input 
                 type="range" min="300" max="2500" step="50"
                 className="w-full accent-primary h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                 value={activeFilters.maxPrice}
                 onChange={(e) => setFilters({...activeFilters, maxPrice: parseInt(e.target.value)})}
               />
               <div className="flex justify-between text-[10px] font-black text-slate-400">
                  <span>R300</span>
                  <span>R2500+</span>
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Language Spoken</label>
               <select 
                 className="w-full h-12 px-4 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20"
                 value={activeFilters.language}
                 onChange={(e) => setFilters({...activeFilters, language: e.target.value})}
               >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
               </select>
            </div>

            <Button 
               variant="outline" className="w-full h-12 border-slate-100 text-xs uppercase tracking-widest font-black"
               onClick={() => setFilters({ specialisation: 'All', language: 'All', maxPrice: 1000, gender: 'Any' })}
            >
               Clear All Filters
            </Button>
         </div>
      </aside>

      {/* DOCTORS GRID */}
      <div className="flex-1 space-y-8 animate-in fade-in duration-1000">
         <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Showing {doctors.length} Verified Practitioners</h4>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-slate-400 uppercase">Sort by:</span>
               <select 
                 className="bg-transparent border-none text-[10px] font-black text-primary uppercase tracking-widest focus:ring-0 cursor-pointer"
                 value={sortBy}
                 onChange={(e) => setSortBy(e.target.value)}
               >
                  <option value="rating">Rating (High to Low)</option>
                  <option value="price_asc">Fee (Low to High)</option>
                  <option value="experience">Clinical Experience</option>
               </select>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
               Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            ) : doctors.length === 0 ? (
               <div className="col-span-full py-32 text-center space-y-6">
                  <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                     <BiUser size={64} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">No Match Found</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">Try broadening your search criteria or adjusting the price range.</p>
               </div>
            ) : (
               doctors.map(doc => (
                 <Card key={doc.id} className="p-0 overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all group flex flex-col" variant="solid">
                    <div className="p-8 space-y-6 flex-1">
                       <div className="flex justify-between items-start">
                          <div className="relative">
                            <Avatar src={doc.avatar} name={doc.name} size="xl" status="online" />
                            <button 
                              onClick={() => toggleFavourite(doc.id)}
                              className={`absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${favourites.includes(doc.id) ? 'bg-rose-500 text-white' : 'bg-white text-slate-300 hover:text-rose-500'}`}
                            >
                               <BiHeart size={20} className={favourites.includes(doc.id) ? 'fill-current' : ''} />
                            </button>
                          </div>
                          <div className="text-right">
                             <div className="flex items-center justify-end gap-1 text-amber-400 mb-1">
                                <BiStar size={16} className="fill-current" />
                                <span className="text-sm font-black text-slate-800">{doc.rating?.toFixed(1) || '4.9'}</span>
                             </div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{doc.reviewCount || 0} Reviews</p>
                          </div>
                       </div>

                       <div>
                          <h5 className="text-xl font-black text-slate-800 leading-tight mb-1">{doc.name}</h5>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 inline-block px-2 py-1 rounded-lg">{doc.specialisation}</p>
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-slate-50 rounded-2xl">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fee</p>
                             <p className="text-sm font-black text-slate-800 leading-none">R{doc.consultationFee}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tight leading-none truncate">{doc.availabilityBadge || 'Available'}</p>
                          </div>
                       </div>

                       <div className="flex flex-wrap gap-2 pb-6 border-b border-slate-50">
                          {doc.languages.slice(0, 3).map((l: string) => (
                            <Badge key={l} label={l} variant="soft" status="info" className="text-[9px] uppercase font-black" />
                          ))}
                       </div>
                    </div>

                    <div className="p-6 bg-slate-50/50 flex gap-3">
                       <Button 
                         variant="white" className="flex-1 border-slate-200 text-xs font-black uppercase tracking-widest h-12"
                         onClick={() => router.push(`/patient/doctors/${doc.id}`)}
                       >
                          View Profile
                       </Button>
                       <Button 
                         className="flex-1 shadow-lg shadow-primary/10 text-xs font-black uppercase tracking-widest h-12"
                         onClick={() => { setSelectedDoc(doc); setShowBooking(true); }}
                       >
                          Book Now
                       </Button>
                    </div>
                 </Card>
               ))
            )}
         </div>
      </div>

      {/* BOOKING MODAL */}
      <Modal isOpen={showBooking} onClose={() => setShowBooking(false)} title="Quick Book Clinical Slot" width="md">
         {selectedDoc && (
           <div className="space-y-8">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl">
                 <Avatar src={selectedDoc.avatar} name={selectedDoc.name} size="lg" />
                 <div>
                    <h6 className="font-black text-slate-800 leading-none mb-1">{selectedDoc.name}</h6>
                    <p className="text-[10px] font-black text-primary uppercase">{selectedDoc.specialisation}</p>
                 </div>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Select Date</label>
                    <input 
                      type="date" 
                      className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-none font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 shadow-inner"
                      value={bookingData.date}
                      onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                    />
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Available Time Slots</label>
                    <div className="grid grid-cols-4 gap-2">
                       {selectedDoc.availableSlots?.map((slot: string) => (
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

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Reason for Visit</label>
                    <textarea 
                      rows={3}
                      placeholder="e.g. Regular prescription refill, chest pain..."
                      className="w-full p-6 rounded-3xl bg-slate-50 border-none font-medium text-sm focus:ring-2 focus:ring-primary/20 shadow-inner"
                      value={bookingData.reason}
                      onChange={(e) => setBookingData({...bookingData, reason: e.target.value})}
                    />
                 </div>

                 <Button 
                   className="w-full h-16 shadow-2xl shadow-primary/30"
                   disabled={!bookingData.time}
                   onClick={handleBooking}
                 >
                    Confirm Clinical Consultation
                 </Button>
              </div>
           </div>
         )}
      </Modal>

      {/* MOBILE FAB FILTER */}
      <button className="fixed bottom-8 right-8 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl lg:hidden flex items-center justify-center animate-bounce">
         <BiSliderAlt size={28} />
      </button>

      <style jsx>{`
         .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default PractitionerDiscovery;
