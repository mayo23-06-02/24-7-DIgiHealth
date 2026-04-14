"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import {
  BiSearch, BiFilterAlt, BiStar, BiHeart, BiCalendar,
  BiMessageDetail, BiCheckShield, BiBadgeCheck, BiGlobe,
  BiPhone, BiVideo, BiLoaderAlt
} from "react-icons/bi";

export default function DoctorsView() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [myDoctors, setMyDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating"); // rating, price, experience
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState({ date: "", time: "", type: "video", reason: "" });
  const [isInitiating, setIsInitiating] = useState(false);

  const [filters, setFilters] = useState({
    specialization: "",
    language: "",
    maxFee: 3000,
  });

  // Load practitioners from DB
  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resAll, resMy] = await Promise.all([
        fetch('/api/patient/practitioners'),
        fetch('/api/patient/my-doctors')
      ]);
      if (resAll.ok) setDoctors(await resAll.json());
      if (resMy.ok) setMyDoctors(await resMy.json());
    } catch { /* silent */ }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialisation?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec = !filters.specialization || doc.specialisation === filters.specialization;
    const matchesLang = !filters.language || doc.languages?.includes(filters.language);
    const matchesFee = !doc.consultationFee || doc.consultationFee <= filters.maxFee;
    return matchesSearch && matchesSpec && matchesLang && matchesFee;
  }).sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "price") return (a.consultationFee || 0) - (b.consultationFee || 0);
    if (sortBy === "experience") return (b.experienceYears || 0) - (a.experienceYears || 0);
    return 0;
  });

  const uniqueSpecializations = [...new Set(doctors.map(d => d.specialisation).filter(Boolean))];
  const allLanguages = [...new Set(doctors.flatMap(d => d.languages || []))];

  const handleStartMessage = async (doc: any) => {
    setIsInitiating(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practitionerId: doc.id }),
      });
      if (res.ok) {
        router.push('/patient/messages');
      }
    } catch { /* silent */ }
    setIsInitiating(false);
    setSelectedDoctor(null);
  };

  const handleImmediateCall = async (doc: any) => {
    setIsInitiating(true);
    try {
      // 1. Create instant consultation
      const res = await fetch('/api/consultations/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practitionerId: doc.id,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false }),
          type: 'video',
          chiefComplaint: 'URGENT: Immediate Test Call requested.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Redir to chat for this consultation with autostart flag
        router.push(`/patient/chat/${data.consultation._id}?autoStart=true`);
      }
    } catch { /* silent */ }
    setIsInitiating(false);
  };

  const handleConfirmBooking = async () => {
    try {
      await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practitionerId: selectedDoctor.id,
          scheduledStartTime: `${bookingData.date}T${bookingData.time}`,
          type: bookingData.type,
          chiefComplaint: bookingData.reason,
        }),
      });
    } catch { /* silent */ }
    setIsBookingModalOpen(false);
    setBookingStep(1);
    setBookingData({ date: "", time: "", type: "video", reason: "" });
    setSelectedDoctor(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER */}
      <PageHeader
        title="Clinical Practitioners"
        subtitle="Find and book appointments with verified HPCSA-registered specialists."
      />

      <div className="flex flex-col lg:flex-row gap-8">

        {/* FILTER SIDEBAR */}
        <div className="w-full lg:w-72 shrink-0 space-y-6">
          <Card className="sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <BiFilterAlt className="text-primary" /> Filters
              </h3>
              <button
                className="text-xs text-primary font-bold"
                onClick={() => setFilters({ specialization: "", language: "", maxFee: 3000 })}
              >
                Reset
              </button>
            </div>

            <div className="space-y-6">
              <Select
                label="Specialization"
                options={[
                  { label: 'All Specializations', value: '' },
                  ...uniqueSpecializations.map(s => ({ label: String(s), value: String(s) })),
                ]}
                value={filters.specialization}
                onChange={(v) => setFilters({ ...filters, specialization: v })}
              />
              <Select
                label="Language"
                options={[
                  { label: 'Any Language', value: '' },
                  ...allLanguages.map(l => ({ label: l, value: l })),
                ]}
                value={filters.language}
                onChange={(v) => setFilters({ ...filters, language: v })}
              />
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Max Consultation Fee
                </label>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>R0</span>
                  <span>R{filters.maxFee}</span>
                </div>
                <input
                  type="range" min="0" max="3000" step="100"
                  className="w-full accent-primary"
                  value={filters.maxFee}
                  onChange={(e) => setFilters({ ...filters, maxFee: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* MAIN LIST */}
        <div className="flex-1 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search doctors, specializations, or conditions..."
                icon={<BiSearch size={24} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { label: "Top Rated", value: "rating" },
                  { label: "Experience", value: "experience" },
                  { label: "Price (Low-High)", value: "price" },
                ]}
              />
            </div>
          </div>

          {/* MY DOCTORS SECTION */}
          {!searchQuery && !filters.specialization && myDoctors.length > 0 && (
            <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <BiHeart className="text-red-500" /> My Doctors
                </h3>
                <p className="text-xs text-slate-400">{myDoctors.length} found</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myDoctors.map(doc => (
                  <Card key={doc.id} className="hover:border-primary/20 transition-all border-slate-100" padding="sm" onClick={() => setSelectedDoctor(doc)}>
                    <div className="flex items-center gap-3">
                      <Avatar src={doc.avatarUrl} name={doc.name} size="md" status={doc.isOnline ? 'online' : 'offline'} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{doc.name}</p>
                        <p className="text-[10px] text-primary font-bold uppercase truncate">{doc.specialisation}</p>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleStartMessage(doc); }}
                          className="w-8 h-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                          title="Chat"
                        >
                          <BiMessageDetail size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleImmediateCall(doc); }}
                          className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                          title="Immediate Test Call"
                        >
                          <BiVideo size={16} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="h-px bg-slate-100 my-8" />
            </section>
          )}

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Available Practitioners</h3>
            {searchQuery && <p className="text-xs text-slate-400">{filteredDoctors.length} doctors found</p>}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <BiLoaderAlt size={40} className="text-primary animate-spin" />
            </div>
          ) : filteredDoctors.length === 0 ? (
            <Card>
              <EmptyState
                title="No Practitioners Found"
                description="No specialists match your criteria. Try adjusting filters."
                icon={<BiSearch size={32} />}
                actionLabel="Clear Filters"
                onAction={() => { setSearchQuery(""); setFilters({ specialization: "", language: "", maxFee: 3000 }); }}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredDoctors.map(doc => (
                <Card key={doc.id} className="group hover:border-primary/20 transition-all cursor-pointer flex flex-col" padding="none">
                  <div className="p-6 flex gap-4" onClick={() => setSelectedDoctor(doc)}>
                    <Avatar src={doc.avatarUrl} name={doc.name} size="xl" status={doc.isOnline ? 'online' : 'offline'} />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xl font-bold text-slate-800 flex items-center gap-1">
                            {doc.name} <BiBadgeCheck className="text-primary" />
                          </h4>
                          <p className="text-primary font-bold text-sm mb-1">{doc.specialisation}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-xs font-bold">
                          <BiStar /> {doc.rating}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1"><BiCalendar /> {doc.experienceYears || 0} yrs exp</div>
                        <div className="flex items-center gap-1"><BiGlobe /> {doc.languages?.length || 1} Languages</div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                    <div className="flex items-center gap-2 mb-4">
                      {doc.isOnline && <Badge label="Online Now" status="success" variant="soft" size="sm" />}
                      {doc.consultationFee && <Badge label={`R${doc.consultationFee}`} status="info" variant="soft" size="sm" />}
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={(e) => { e.stopPropagation(); setSelectedDoctor(doc); setIsBookingModalOpen(true); }}>
                        Book Now
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-12 px-0 flex justify-center bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-100"
                        onClick={(e) => { e.stopPropagation(); handleImmediateCall(doc); }}
                        title="Start Immediate Test Call"
                      >
                        <BiVideo size={20} />
                      </Button>
                      <Button
                        variant="outline"
                        className="w-12 px-0 flex justify-center text-primary hover:bg-primary hover:text-white"
                        onClick={(e) => { e.stopPropagation(); handleStartMessage(doc); }}
                        title="Send Message"
                      >
                        <BiMessageDetail size={20} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DOCTOR PROFILE MODAL */}
      <Modal
        isOpen={!!selectedDoctor && !isBookingModalOpen}
        onClose={() => setSelectedDoctor(null)}
        title="Doctor Profile"
        width="lg"
      >
        {selectedDoctor && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar src={selectedDoctor.avatarUrl} name={selectedDoctor.name} size="3xl" status={selectedDoctor.isOnline ? 'online' : 'offline'} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">{selectedDoctor.name}</h2>
                  <BiBadgeCheck className="text-emerald-500 text-2xl" />
                </div>
                <p className="text-primary font-black uppercase tracking-widest text-sm mb-4">{selectedDoctor.specialisation}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedDoctor.hpcsNumber && <Badge label={`HPCSA: ${selectedDoctor.hpcsNumber}`} status="premium" variant="soft" />}
                  {selectedDoctor.experienceYears && <Badge label={`${selectedDoctor.experienceYears} Yrs Exp`} status="info" variant="soft" />}
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-xl text-sm font-bold border border-amber-100">
                    <BiStar /> {selectedDoctor.rating} Rating
                  </div>
                </div>
                {selectedDoctor.about && <p className="text-slate-600 leading-relaxed font-medium">{selectedDoctor.about}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDoctor.languages?.map((l: string) => <Badge key={l} label={l} variant="outline" className="bg-white" />)}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Accepted Medical Aids</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDoctor.acceptsMedicalAid?.map((m: string) => <Badge key={m} label={m} variant="outline" className="bg-white" />)}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1 shadow-2xl shadow-primary/20" size="lg" onClick={() => setIsBookingModalOpen(true)}>
                <BiCalendar className="mr-2" /> Book Appointment
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-slate-200"
                disabled={isInitiating}
                onClick={() => handleStartMessage(selectedDoctor)}
              >
                {isInitiating ? <BiLoaderAlt className="animate-spin mr-2" /> : <BiMessageDetail size={20} className="mr-2 text-primary" />}
                Message
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* BOOKING FLOW MODAL */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title={`Book Appointment — Step ${bookingStep} of 2`}
        width="md"
      >
        {selectedDoctor && (
          <div className="space-y-8">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <Avatar src={selectedDoctor.avatarUrl} name={selectedDoctor.name} size="md" />
              <div>
                <p className="font-bold text-slate-800">{selectedDoctor.name}</p>
                <p className="text-xs text-slate-500 font-medium">{selectedDoctor.specialisation} • {selectedDoctor.consultationFee ? `R${selectedDoctor.consultationFee}` : 'Fee TBC'}</p>
              </div>
            </div>

            {bookingStep === 1 ? (
              <div className="space-y-6">
                <Input
                  label="Select Date"
                  type="date"
                  value={bookingData.date}
                  onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                />
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Time Slots</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['08:00', '09:00', '10:00', '11:00', '14:00', '15:30'].map(slot => (
                      <button
                        key={slot}
                        onClick={() => setBookingData({ ...bookingData, time: slot })}
                        className={`h-12 rounded-xl text-sm font-bold transition-all ${bookingData.time === slot ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <Select
                  label="Consultation Type"
                  value={bookingData.type}
                  onChange={(v) => setBookingData({ ...bookingData, type: v })}
                  options={[
                    { label: 'Video Call', value: 'video' },
                    { label: 'Encrypted Chat', value: 'chat' },
                    { label: 'In-Person', value: 'in_person' },
                  ]}
                />
                <Button
                  className="w-full h-14"
                  disabled={!bookingData.date || !bookingData.time}
                  onClick={() => setBookingStep(2)}
                >
                  Continue
                </Button>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <Input
                  label="Reason for Consultation"
                  textarea
                  placeholder="Briefly describe your symptoms or concerns..."
                  value={bookingData.reason}
                  onChange={(e) => setBookingData({ ...bookingData, reason: e.target.value })}
                />
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-3">
                  <BiCheckShield className="text-primary mt-1 shrink-0" size={20} />
                  <div>
                    <p className="font-bold text-primary mb-1">Secure Booking</p>
                    <p className="text-xs text-slate-600">Your data is end-to-end encrypted and protected under the POPI Act.</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setBookingStep(1)}>Back</Button>
                  <Button className="flex-1 shadow-xl shadow-primary/20" onClick={handleConfirmBooking}>
                    Confirm Booking
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
