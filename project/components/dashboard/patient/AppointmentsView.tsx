'use client';

import React, { useState, useEffect, useMemo } from "react";
import { 
  BiCalendar, BiTime, BiVideo, BiMessageDetail, BiMap, 
  BiDotsVerticalRounded, BiSearch, BiFilterAlt, BiGridAlt, 
  BiListUl, BiChevronRight, BiDownload, BiStar, BiTrash,
  BiCalendarEdit, BiCheckShield, BiMicrophone, BiPlus,
  BiCheckCircle, BiXCircle, BiFile
} from "react-icons/bi";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import PatientCalendar from "./PatientCalendar";

type AppointmentStatus = 'upcoming' | 'past' | 'cancelled';
type ViewType = 'list' | 'calendar';

interface Appointment {
  id: string;
  title: string;
  time: string;
  duration: string;
  color: string;
  doctor: string;
  doctorAvatar?: string;
  specialization?: string;
  type: 'video' | 'chat' | 'in_person';
  status: string;
  date: string;
  scheduledStartTime: string;
  description?: string;
  reason?: string;
  cancelledBy?: string;
}

const AppointmentsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppointmentStatus>('upcoming');
  const [viewType, setViewType] = useState<ViewType>('list');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  
  // Booking Wizard State
  const [bookingStep, setBookingStep] = useState(1);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [bookingData, setBookingData] = useState({ date: new Date().toISOString().split('T')[0], time: '', type: 'video', reason: '' });

  // Stats for tabs
  const [counts, setCounts] = useState({ upcoming: 0, past: 0, cancelled: 0 });

  useEffect(() => {
    fetchAppointments();
  }, [activeTab]);

  useEffect(() => {
    if (showBookingWizard) {
      fetch('/api/practitioners/available')
        .then(res => res.json())
        .then(setAvailableDocs);
    }
  }, [showBookingWizard]);

  const handleBookAppointment = async () => {
    try {
      const res = await fetch('/api/consultations/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practitionerId: selectedDoc.id,
          ...bookingData
        })
      });
      if (res.ok) {
        setShowBookingWizard(false);
        setBookingStep(1);
        fetchAppointments();
      }
    } catch (err) {
      console.error("Booking Error:", err);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
       const res = await fetch(`/api/patient/appointments?status=${activeTab}`);
       const data = await res.json();
       if (Array.isArray(data)) {
         setAppointments(data);
         // Enforce count logic (this could be optimized)
         setCounts(prev => ({ ...prev, [activeTab]: data.length }));
       } else {
         setAppointments([]);
       }
    } catch (err) {
       console.error("Fetch Error:", err);
       setAppointments([]);
    } finally {
       setLoading(false);
    }
  };

  const [sortBy, setSortBy] = useState("newest");

  const filteredAppointments = useMemo(() => {
    let list = appointments.filter(a => 
      a.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    
    return list;
  }, [appointments, searchQuery, sortBy]);

  // Actions
  const handleJoinCell = (appt: Appointment) => { 
    console.log("Joining consultation..."); 
    // In real app: open VideoCallModal or ChatModal
  };
  
  const handleReschedule = (appt: Appointment) => { console.log("Rescheduling..."); };
  const handleCancel = (appt: Appointment) => { console.log("Cancelling..."); };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <PageHeader
        title="Clinical Appointments"
        subtitle="Manage your scheduled consultations and medical history."
        right={
          <>
            <Button variant="outline" className="h-12 border-slate-200">
              <BiDownload className="mr-2" /> Export History
            </Button>
            <Button
              className="h-12 shadow-xl shadow-primary/20"
              onClick={() => setShowBookingWizard(true)}
            >
              <BiPlus className="mr-2" /> Book New
            </Button>
          </>
        }
      />

      {/* TABS & TOOLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm sticky top-0 z-30">
        <div className="flex p-1 gap-1">
          {(['upcoming', 'past', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all
                ${activeTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-50'}
              `}
            >
              {tab}
              <span className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] ${activeTab === tab ? 'bg-white/20' : 'bg-slate-100'}`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 px-4">
          <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
             <select 
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value)}
               className="px-4 py-2 bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-primary focus:ring-0 cursor-pointer"
             >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
             </select>
          </div>
          <div className="relative border border-slate-100 rounded-xl bg-slate-50 flex items-center">
             <input type="date" className="h-[40px] px-4 rounded-xl bg-transparent border-none text-xs font-black uppercase tracking-widest text-primary focus:ring-0" />
          </div>
          <div className="w-48">
             <Input 
               type="text" 
               placeholder="Search..."
               icon={<BiSearch size={20} />}
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
            <button 
              onClick={() => setViewType('list')}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${viewType === 'list' ? 'bg-white shadow text-primary' : 'text-slate-400'}`}
            >
              <BiListUl size={20} />
            </button>
            <button 
              onClick={() => setViewType('calendar')}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${viewType === 'calendar' ? 'bg-white shadow text-primary' : 'text-slate-400'}`}
            >
              <BiCalendar size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* APPOINTMENTS LIST/GRID */}
      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
           <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
           <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Synchronizing Encrypted Data...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card className="p-8">
           <EmptyState 
             title={`No ${activeTab} Appointments`}
             description="Every clinical session scheduled via 24/7 DIgiHealth will appear here."
             icon={<BiCalendar size={32} />}
           />
        </Card>
      ) : viewType === 'calendar' ? (
        <div className="h-[800px] w-full mt-4">
            <PatientCalendar />
        </div>
      ) : (
        <Card className="p-0 overflow-hidden" variant="solid">
           <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-8 py-6">Medical Provider</th>
                    <th className="px-8 py-6">Schedule Details</th>
                    <th className="px-8 py-6">Session Type</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appt) => (
                    <tr key={appt.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <Avatar src={appt.doctorAvatar} name={appt.doctor} size="sm" />
                          <div>
                            <p className="font-black text-slate-800 leading-none mb-1">{appt.doctor}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{appt.specialization || 'Clinical Specialist'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-700">{appt.date}</p>
                          <p className="text-xs text-slate-400 font-medium">{appt.time} ({appt.duration})</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <Badge 
                          label={appt.type.replace('_', ' ')} 
                          icon={appt.type === 'video' ? <BiVideo /> : appt.type === 'chat' ? <BiMessageDetail /> : <BiMap />}
                          status="info"
                          variant="soft"
                          className="uppercase text-[10px]"
                        />
                      </td>
                      <td className="px-8 py-6">
                        <Badge 
                          label={appt.status} 
                          status={appt.status === 'scheduled' ? 'warning' : appt.status === 'completed' ? 'success' : 'danger'} 
                          variant="solid"
                          size="sm"
                        />
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-2">
                            {activeTab === 'upcoming' && (
                               <Button size="sm" className="h-9 px-4" onClick={() => handleJoinCell(appt)}>Join</Button>
                            )}
                            <button 
                              onClick={() => setSelectedAppt(appt)}
                              className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-all"
                            >
                               <BiChevronRight size={20} />
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </Card>
      )}

      {/* APPOINTMENT ACTIONS MODAL */}
      <Modal
        isOpen={!!selectedAppt}
        onClose={() => setSelectedAppt(null)}
        title={activeTab === 'upcoming' ? 'Manage Appointment' : 'Clinical Summary'}
        width="md"
      >
        {selectedAppt && (
          <div className="space-y-8">
             <div className="flex gap-6 items-start">
               <Avatar src={selectedAppt.doctorAvatar} name={selectedAppt.doctor} size="xl" />
               <div className="flex-1">
                 <h4 className="text-2xl font-black text-slate-800 tracking-tight">{selectedAppt.doctor}</h4>
                 <p className="text-primary font-black uppercase tracking-widest text-[10px] mb-4">{selectedAppt.specialization || 'Clinical Specialist'}</p>
                 <div className="flex gap-2">
                   <Badge label={selectedAppt.date} status="info" variant="soft" />
                   <Badge label={selectedAppt.time} status="premium" variant="soft" />
                 </div>
               </div>
             </div>

             <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 shadow-inner">
                <div>
                   <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chief Complaint</h6>
                   <p className="text-sm font-medium text-slate-600 italic leading-relaxed">"{selectedAppt.description || 'Routine Checkup'}"</p>
                </div>
                {activeTab === 'cancelled' && (
                  <div className="pt-4 border-t border-slate-200">
                    <h6 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Cancellation Reason</h6>
                    <p className="text-sm font-bold text-red-600">{selectedAppt.reason || 'Patient Conflict'}</p>
                    <p className="text-[10px] text-red-400 font-bold mt-1">Cancelled by: {selectedAppt.cancelledBy || 'Patient'}</p>
                  </div>
                )}
             </div>

             <div className="grid grid-cols-1 gap-3">
                {activeTab === 'upcoming' ? (
                  <>
                    <Button className="h-14 justify-between" onClick={() => handleJoinCell(selectedAppt)}>
                      <span>Launch Video Consulting Room</span>
                      <BiVideo size={20} />
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                       <Button variant="white" className="h-14 border-slate-100" onClick={() => handleReschedule(selectedAppt)}>
                          <BiCalendarEdit className="mr-2" size={20} /> Reschedule
                       </Button>
                       <Button variant="danger" className="h-14 bg-red-50 text-red-600 border-none" onClick={() => handleCancel(selectedAppt)}>
                          <BiTrash className="mr-2" size={20} /> Cancel
                       </Button>
                    </div>
                  </>
                ) : activeTab === 'past' ? (
                  <>
                    <Button className="h-14 justify-between bg-emerald-600 hover:bg-emerald-700">
                      <span>Download Clinical Prescription (PDF)</span>
                      <BiFile size={20} />
                    </Button>
                    <Button variant="white" className="h-14 justify-between border-slate-100">
                      <span className="text-slate-700">View Encrypted SOAP Notes</span>
                      <BiCheckShield size={20} className="text-primary" />
                    </Button>
                    <div className="pt-6 border-t border-slate-100">
                       <h6 className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Rate your Experience</h6>
                       <div className="flex justify-center gap-2">
                          {[1,2,3,4,5].map(s => (
                            <button key={s} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-amber-400 hover:bg-amber-50 transition-all">
                               <BiStar size={24} />
                            </button>
                          ))}
                       </div>
                    </div>
                  </>
                ) : (
                  <Button className="h-14 shadow-xl shadow-primary/20">Book Clinical Re-appointment</Button>
                )}
             </div>

             <div className="p-4 bg-slate-50 rounded-2xl flex items-start gap-4">
                <BiCheckShield className="text-primary shrink-0 mt-1" />
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase">
                  End-to-end encrypted medical data. POPI Act compliant clinical record handling.
                </p>
             </div>
          </div>
        )}
      </Modal>

      {/* BOOKING WIZARD MODAL */}
      <Modal
        isOpen={showBookingWizard}
        onClose={() => setShowBookingWizard(false)}
        title={`Book Clinical Appointment - Step ${bookingStep} of 2`}
        width="lg"
      >
        <div className="space-y-8">
           {bookingStep === 1 ? (
             <div className="space-y-6">
                <div className="flex flex-col gap-2">
                   <h4 className="text-xl font-black text-slate-800">Select Medical Specialist</h4>
                   <p className="text-sm text-slate-400 font-medium">Choose from our verified clinical network.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                   {availableDocs.map(doc => (
                      <div 
                        key={doc.id}
                        onClick={() => { setSelectedDoc(doc); setBookingStep(2); }}
                        className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${selectedDoc?.id === doc.id ? 'border-primary bg-primary/5' : 'border-slate-50 hover:border-primary/20 hover:bg-slate-50'}`}
                      >
                         <div className="flex items-center gap-4">
                            <Avatar src={doc.avatar} name={doc.name} size="lg" />
                            <div>
                               <p className="font-black text-slate-800">{doc.name}</p>
                               <p className="text-[10px] font-black text-primary uppercase tracking-widest">{doc.specialisation}</p>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           ) : (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-3xl">
                   <Avatar src={selectedDoc.avatar} name={selectedDoc.name} size="lg" />
                   <div>
                      <p className="font-black text-slate-800">{selectedDoc.name}</p>
                      <p className="text-xs font-bold text-slate-400">{selectedDoc.specialisation}</p>
                   </div>
                   <button onClick={() => setBookingStep(1)} className="ml-auto text-xs font-black text-primary uppercase tracking-widest">Change Doctor</button>
                </div>

                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Input 
                           type="date" 
                           label="Preferred Date"
                           value={bookingData.date}
                           onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                         />
                      </div>
                      <div className="space-y-2">
                         <Select 
                           label="Consultation Type"
                           value={bookingData.type}
                           onChange={(v) => setBookingData({...bookingData, type: v})}
                           options={[
                             { label: 'Video Call', value: 'video' },
                             { label: 'Encrypted Chat', value: 'chat' },
                             { label: 'In-Person Facility', value: 'in_person' }
                           ]}
                         />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Slots (Today/Selected Date)</label>
                      <div className="grid grid-cols-4 gap-2">
                         {selectedDoc.availableSlots.map((slot: string) => (
                            <button 
                              key={slot}
                              onClick={() => setBookingData({...bookingData, time: slot})}
                              className={`h-12 rounded-xl text-xs font-black transition-all ${bookingData.time === slot ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
                            >
                               {slot}
                            </button>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-2">
                      <Input 
                         isTextArea
                         label="Chief Complaint / Reason"
                         rows={3} 
                         placeholder="Briefly describe your systems or reason for follow-up..."
                         value={bookingData.reason}
                         onChange={(e) => setBookingData({...bookingData, reason: e.target.value})}
                      />
                   </div>

                   <Button 
                     className="w-full h-16 shadow-2xl shadow-primary/30"
                     disabled={!bookingData.time || !bookingData.reason}
                     onClick={handleBookAppointment}
                   >
                     Confirm Clinical Appointment
                   </Button>
                </div>
             </div>
           )}
        </div>
      </Modal>
    </div>
  );
};

export default AppointmentsView;
