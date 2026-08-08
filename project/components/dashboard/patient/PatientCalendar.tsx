"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import Modal from "@/components/ui/Modal";

// Sub-components
import CalendarHeader from "./calendar/CalendarHeader";
import DayCard from "./calendar/DayCard";
import ScheduleFeed from "./calendar/ScheduleFeed";
import AppointmentDetail from "./calendar/AppointmentDetail";
import EventModal from "./calendar/EventModal";
import Carousel from "@/components/ui/Carousel";

interface Appointment {
  id: string;
  title?: string;
  dr?: string;
  dr_specialty?: string;
  time: string;
  date: string;
  type: "appointment" | "reminder" | "refill" | "note";
  status: "confirmed" | "pending" | "cancelled";
  concern?: string;
  notes?: string;
  location?: string;
  institution?: string;
  img?: string;
  countdown?: string;
  durationMinutes?: number;
  prescriptionId?: string;
  prescriptionName?: string;
  deliveryMethod?: "pickup" | "delivery";
  deliveryAddress?: string;
  pharmacyId?: string;
  paymentMethod?: "insurance" | "card" | "cash";
  reminderDays?: number;
}

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  refillsRemaining: number;
  expiryDate: string;
}

interface PatientCalendarProps {
  headerAction?: React.ReactNode;
}

export default function PatientCalendar({ headerAction }: PatientCalendarProps = {}) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [liveCarouselIndex, setLiveCarouselIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [unavailableDays, setUnavailableDays] = useState<string[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");

  const [doctors, setDoctors] = useState<{ name: string }[]>([]);
  const [facilities, setFacilities] = useState<{ name: string }[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    title: "",
    time: "09:00",
    type: "reminder" as Appointment["type"],
    notes: "",
    doctor: "",
    institution: "",
    prescriptionId: "",
    deliveryMethod: "pickup" as "pickup" | "delivery",
    deliveryAddress: "",
    pharmacyId: "",
    paymentMethod: "insurance" as "insurance" | "card" | "cash",
    reminderDays: 3,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    setIsClient(true);
    fetchAgenda();
    fetchLists();
    const updateCount = () => {
      if (window.innerWidth >= 1200) setVisibleCount(3);
      else if (window.innerWidth >= 800) setVisibleCount(2);
      else setVisibleCount(1);
    };
    updateCount();
    window.addEventListener("resize", updateCount);
    return () => window.removeEventListener("resize", updateCount);
  }, []);

  const fetchAgenda = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/agenda");
      if (res.ok) setAppointments(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchLists = async () => {
    try {
      const [docsRes, facsRes] = await Promise.all([fetch("/api/patient/my-doctors"), fetch("/api/patient/facilities")]);
      if (docsRes.ok) setDoctors(await docsRes.json());
      if (facsRes.ok) setFacilities(await facsRes.json());
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (showAddModal && addForm.type === "refill") {
      setLoadingPrescriptions(true);
      fetch("/api/patient/prescriptions").then(res => res.json()).then(setPrescriptions).finally(() => setLoadingPrescriptions(false));
    }
  }, [showAddModal, addForm.type]);

  const doctorOptions = useMemo(() => [{ value: "", label: "No preference" }, ...doctors.map(d => ({ value: d.name, label: d.name }))], [doctors]);
  const facilityOptions = useMemo(() => [{ value: "", label: "No preference" }, ...facilities.map(f => ({ value: f.name, label: f.name }))], [facilities]);
  const prescriptionOptions = useMemo(() => {
    const opts = prescriptions.map(p => ({ value: p.id, label: `${p.medicationName} (${p.dosage}) - ${p.refillsRemaining} refills left` }));
    opts.unshift({ value: "new", label: "+ Request new prescription" });
    return opts;
  }, [prescriptions]);

  const carouselDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() + i);
      const dateStr = d.toDateString();
      const dayAppts = appointments.filter(a => a.date === dateStr);
      const markerMap = dayAppts.reduce((acc: any, curr) => { acc[curr.type || "appointment"] = (acc[curr.type || "appointment"] || 0) + 1; return acc; }, {});
      return {
        dateStr, dayNum: d.getDate(), dayName: d.toLocaleString("en-US", { weekday: "short" }), monthName: d.toLocaleString("en-US", { month: "short" }),
        isToday: i === 0, isUnavailable: unavailableDays.includes(dateStr), markers: Object.keys(markerMap).map(type => ({ type, count: markerMap[type] })),
      };
    });
  }, [appointments, unavailableDays]);

  useEffect(() => { if (carouselDays[carouselIndex]) { setSelectedDateStr(carouselDays[carouselIndex].dateStr); setLiveCarouselIndex(0); } }, [carouselIndex, carouselDays]);

  const filteredAppointments = useMemo(() => appointments.filter(a => a.date === selectedDateStr), [appointments, selectedDateStr]);

  const handleAddSubmit = async () => {
    if (!addForm.title.trim() && addForm.type !== "refill") return;
    setIsSaving(true);
    try {
      const url = editingId ? `/api/patient/agenda/${editingId}` : "/api/patient/agenda";
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...addForm, date: showAddModal }) });
      if (res.ok) {
        await fetchAgenda();
        setShowAddModal(null);
        toast.success(editingId ? "Event updated" : "Event synchronised");
      }
    } catch { toast.error("Failed to save event"); }
    setIsSaving(false);
  };

  const handleDelete = async (appt: Appointment) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/patient/agenda/${appt.id}`, { method: "DELETE" });
      if (res.ok) { await fetchAgenda(); toast.success("Event removed"); setSelectedAppointment(null); }
    } catch { toast.error("Failed to remove event"); }
    setIsDeleting(false);
  };

  const handleEdit = (appt: Appointment) => {
    setEditingId(appt.id);
    setAddForm({ ...addForm, title: appt.title || appt.dr || "", time: appt.time, type: appt.type, notes: appt.notes || appt.concern || "", doctor: appt.dr || "", institution: appt.institution || "" });
    setShowAddModal(appt.date);
  };

  const isJoinable = (appt: Appointment): boolean => {
    if (appt.type !== "appointment" || appt.status !== "confirmed") return false;
    const apptDate = new Date(`${appt.date} ${appt.time}`);
    const now = new Date();
    return now.getTime() >= apptDate.getTime() - 5 * 60000 && now.getTime() <= apptDate.getTime() + (appt.durationMinutes || 30) * 60000;
  };

  const getJoinCountdown = (appt: Appointment): string => {
    const diff = new Date(`${appt.date} ${appt.time}`).getTime() - new Date().getTime();
    return diff <= 0 ? "Live now" : diff < 300000 ? `Starts in ${Math.floor(diff/60000)} min` : "";
  };

  const getMarkerColor = (type: string) => ({ refill: "bg-emerald-400", reminder: "bg-gray-400", appointment: "bg-primary" }[type] || "bg-slate-400");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CalendarHeader
        onPrev={() => setCarouselIndex(p => Math.max(0, p - 1))}
        onNext={() => setCarouselIndex(p => Math.min(carouselDays.length - 1, p + 1))}
        action={headerAction}
      />

      <div className="flex-1 flex flex-col overflow-y-auto py-4 space-y-4 custom-scrollbar">
        <div className="flex-shrink-0">
          <Carousel selectedItem={carouselIndex} onChange={setCarouselIndex} centerMode centerSlidePercentage={100 / visibleCount}>
            {carouselDays.map((day, idx) => (
              <DayCard key={idx} day={day} idx={idx} onSelect={setShowAddModal} onDrop={async (e, target) => {
                const id = e.dataTransfer.getData("apptId");
                if (id) { await fetch(`/api/patient/agenda/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: target }) }); fetchAgenda(); }
              }} onToggleUnavailable={d => setUnavailableDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])} getMarkerColor={getMarkerColor} />
            ))}
          </Carousel>
        </div>

        <ScheduleFeed
          selectedDateStr={selectedDateStr} filteredAppointments={filteredAppointments} liveCarouselIndex={liveCarouselIndex}
          setLiveCarouselIndex={setLiveCarouselIndex} isClient={isClient} isJoinable={isJoinable} getJoinCountdown={getJoinCountdown}
          setSelectedAppointment={setSelectedAppointment}
        />
      </div>

      <EventModal
        showAddModal={showAddModal} onClose={() => setShowAddModal(null)} editingId={editingId} addForm={addForm} setAddForm={setAddForm}
        appointments={appointments} getMarkerColor={getMarkerColor} onDragStart={(e, id) => e.dataTransfer.setData("apptId", id)}
        handleEdit={handleEdit} handleDelete={handleDelete} doctors={doctors} doctorOptions={doctorOptions} facilityOptions={facilityOptions}
        loadingPrescriptions={loadingPrescriptions} prescriptionOptions={prescriptionOptions} isSaving={isSaving} handleAddSubmit={handleAddSubmit}
      />

      <Modal isOpen={!!selectedAppointment} onClose={() => setSelectedAppointment(null)} title="Event Details">
        {selectedAppointment && (
          <AppointmentDetail
            appt={selectedAppointment} isJoinable={isJoinable(selectedAppointment)} isPersonalEvent={["note", "reminder", "appointment", "refill"].includes(selectedAppointment.type)}
            isDeleting={isDeleting} onEdit={handleEdit} onDelete={handleDelete} onClose={() => setSelectedAppointment(null)}
          />
        )}
      </Modal>
    </div>
  );
}
