"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  BiChevronLeft,
  BiChevronRight,
  BiTime,
  BiCalendar,
  BiPlus,
  BiTrash,
  BiLoaderAlt,
  BiTrendingUp,
  BiBlock,
  BiMap,
  BiUser,
  BiBuilding,
  BiPencil,
  BiBell,
} from "react-icons/bi";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Carousel from "@/components/ui/Carousel";
import { toast } from "react-hot-toast";
import Avatar from "@/components/ui/Avatar";

export default function PatientCalendar() {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [liveCarouselIndex, setLiveCarouselIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(
    null,
  );
  const [unavailableDays, setUnavailableDays] = useState<string[]>([]);

  // Selection lists
  const [doctors, setDoctors] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);

  // Add event form state
  const [showAddModal, setShowAddModal] = useState<string | null>(null); // dateStr
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    title: "",
    time: "09:00",
    type: "appointment",
    notes: "",
    doctor: "",
    institution: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchAgenda();
    fetchLists();
  }, []);

  const fetchAgenda = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/agenda");
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetchLists = async () => {
    try {
      const [docsRes, facsRes] = await Promise.all([
        fetch("/api/patient/my-doctors"),
        fetch("/api/patient/facilities"),
      ]);
      if (docsRes.ok) setDoctors(await docsRes.json());
      if (facsRes.ok) setFacilities(await facsRes.json());
    } catch {
      /* silent */
    }
  };

  const doctorOptions = useMemo(
    () => [
      { value: "", label: "No preference" },
      ...doctors.map((d) => ({ value: d.name, label: d.name })),
    ],
    [doctors],
  );

  const facilityOptions = useMemo(
    () => [
      { value: "", label: "Home/Private" },
      ...facilities.map((f) => ({ value: f.name, label: f.name })),
    ],
    [facilities],
  );

  const carouselDays = useMemo(() => {
    const days: any[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toDateString();
      const dayAppts = appointments.filter((a) => a.date === dateStr);

      // Group markers by type and count
      const markerMap = dayAppts.reduce((acc: any, curr) => {
        const type = curr.type || "appointment";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const markers = Object.keys(markerMap).map((type) => ({
        type,
        count: markerMap[type],
      }));

      days.push({
        dateStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleString("en-US", { weekday: "short" }),
        monthName: d.toLocaleString("en-US", { month: "short" }),
        isToday: i === 0,
        isUnavailable: unavailableDays.includes(dateStr),
        markers,
        dayAppts,
      });
    }
    return days;
  }, [appointments, unavailableDays]);

  const toggleUnavailable = (dateStr: string) =>
    setUnavailableDays((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr],
    );

  const handleAddSubmit = async () => {
    if (!addForm.title.trim() || !showAddModal) return;
    setIsSaving(true);
    try {
      const url = editingId
        ? `/api/patient/agenda/${editingId}`
        : "/api/patient/agenda";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, date: showAddModal }),
      });

      if (res.ok) {
        // Notification simulation
        if (addForm.doctor || addForm.institution) {
          const target = addForm.doctor || addForm.institution;
          toast.promise(new Promise((resolve) => setTimeout(resolve, 800)), {
            loading: `Notifying ${target}...`,
            success: `${target} has been notified`,
            error: "Failed to notify",
          });
        }

        await fetchAgenda();
        setShowAddModal(null);
        setEditingId(null);
        setAddForm({
          title: "",
          time: "09:00",
          type: "appointment",
          notes: "",
          doctor: "",
          institution: "",
        });
        toast.success(
          editingId
            ? "Event updated"
            : "Event synchronised with your care team",
        );
      }
    } catch {
      toast.error("Failed to save event");
    }
    setIsSaving(false);
  };

  const handleDelete = async (appt: any) => {
    if (!appt.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/patient/agenda/${appt.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAgenda();
        toast.success("Event removed");
      }
    } catch {
      toast.error("Failed to remove event");
    }
    setIsDeleting(false);
    setSelectedAppointment(null);
  };

  const handleEdit = (appt: any) => {
    setEditingId(appt.id);
    setAddForm({
      title: appt.title || appt.dr || "",
      time: appt.time || "09:00",
      type: appt.type || "appointment",
      notes: appt.notes || appt.concern || "",
      doctor: appt.dr || "",
      institution: appt.institution || "",
    });
    setShowAddModal(appt.date);
  };

  const onDragStart = (e: React.DragEvent, apptId: string) => {
    e.dataTransfer.setData("apptId", apptId);
  };

  const onDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const apptId = e.dataTransfer.getData("apptId");
    if (!apptId) return;

    try {
      const res = await fetch(`/api/patient/agenda/${apptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: targetDate }),
      });
      if (res.ok) {
        await fetchAgenda();
        toast.success("Moved successfully");
      }
    } catch {
      toast.error("Failed to move event");
    }
  };

  const isPersonalEvent = (appt: any) =>
    ["note", "reminder", "appointment"].includes(appt.type);

  const getMarkerColor = (type: string) => {
    switch (type) {
      case "refill":
        return "bg-emerald-400";
      case "reminder":
        return "bg-amber-400";
      case "appointment":
        return "bg-primary";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-slate-800 ">
            Schedule at a Glance
          </p>
          <p className="text-xs font-thin text-slate-400 ">
            Manage your appointments and medication reminders.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCarouselIndex((prev) => Math.max(0, prev - 1))}
            className="w-10 h-10 hover:bg-primary hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-400"
          >
            <BiChevronLeft size={24} />
          </button>
          <button
            onClick={() =>
              setCarouselIndex((prev) =>
                Math.min(carouselDays.length - 1, prev + 1),
              )
            }
            className="w-10 h-10 hover:bg-primary hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-400"
          >
            <BiChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-hidden custom-scrollbar py-4 space-y-4">
        {/* DAY CAROUSEL */}
        <section>
          <Carousel
            selectedItem={carouselIndex}
            onChange={setCarouselIndex}
            centerMode={true}
            centerSlidePercentage={
              isClient && window.innerWidth < 1024 ? 80 : 33.33
            }
          >
            {carouselDays.map((day, idx) => (
              <div
                key={idx}
                className="px-1 pb-6 h-full"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, day.dateStr)}
              >
                <div
                  onClick={() => setShowAddModal(day.dateStr)}
                  className={`h-56 rounded-lg border transition-all duration-500 relative p-4 flex flex-col justify-between group cursor-pointer ${
                    day.isUnavailable
                      ? "bg-slate-50 border-slate-100 opacity-50 grayscale pointer-events-none"
                      : day.isToday
                        ? "border-primary bg-primary/5 shadow-xl shadow-primary/5 ring-1 ring-primary/20"
                        : "border-slate-100 bg-white hover:border-primary/30 hover:shadow-xl hover:shadow-slate-200/50"
                  }`}
                >
                  <div className="flex justify-between items-center ">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5 items-center">
                        {day.markers.map((m: any, i: number) => (
                          <div key={i} className="flex items-center gap-0.5">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${getMarkerColor(m.type)}`}
                            />
                            {m.count > 1 && (
                              <span className="text-[9px] font-bold text-slate-500">
                                {m.count}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <span
                        className={`text-[10px] items-center font-bold whitespace-nowrap ${day.isToday ? "text-primary flex gap-1" : "text-slate-400"}`}
                      >
                        {day.dayName} {day.monthName}
                      </span>
                    </div>
                    {day.isToday && (
                      <div className="text-[8px] font-bold uppercase bg-primary px-2 py-1 rounded-full text-white">
                        Today
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      disabled={day.isUnavailable}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddModal(day.dateStr);
                      }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        day.isUnavailable
                          ? "bg-slate-100 text-slate-300 pointer-events-none"
                          : "text-slate-500 bg-slate-200 hover:text-primary hover:bg-primary/10"
                      }`}
                    >
                      <BiPlus size={18} />
                    </button>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex flex-col-reverse gap-2">
                      <span
                        className={`text-4xl font-semibold tracking-tighter ${day.isToday ? "text-primary" : "text-slate-200 group-hover:text-primary transition-colors"}`}
                      >
                        {day.dayNum.toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUnavailable(day.dateStr);
                        }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${day.isUnavailable ? "bg-primary text-white" : "text-slate-300 bg-slate-50 hover:text-primary"}`}
                      >
                        <BiBlock size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Carousel>
        </section>

        {/* LIVE SCHEDULE */}
        <section className="space-y-6  h-full">
          <div className="flex items-center  justify-between">
            <h4 className="text-lg font-bold text-slate-800">
              Live Schedule Overview
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setLiveCarouselIndex((prev) => Math.max(0, prev - 1))
                }
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-400"
              >
                <BiChevronLeft size={24} />
              </button>
              <button
                onClick={() =>
                  setLiveCarouselIndex((prev) =>
                    Math.min(appointments.length - 1, prev + 1),
                  )
                }
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-400"
              >
                <BiChevronRight size={24} />
              </button>
            </div>
          </div>

          {appointments.length > 0 ? (
            <Carousel
              selectedItem={liveCarouselIndex}
              onChange={setLiveCarouselIndex}
              centerMode={true}
              centerSlidePercentage={
                isClient && window.innerWidth < 1024 ? 90 : 85
              }
              className="h-full"
            >
              {appointments.map((appt, idx) => (
                <div key={appt.id || idx} className="px-1 h-full">
                  <div
                    onClick={() => setSelectedAppointment(appt)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group flex flex-col h-full cursor-pointer"
                  >
                    <div className="flex h-full justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden relative border-2 border-white shadow-sm">
                          {appt.img ? (
                            <Avatar name={appt.dr} src={appt.img} size="sm" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {appt.type === "refill"
                                ? "💊"
                                : appt.type === "reminder"
                                  ? "🔔"
                                  : "📅"}
                            </div>
                          )}
                        </div>
                        <div>
                          <h5 className="text-base font-bold  text-slate-800 leading-none mb-1 truncate max-w-[150px]">
                            {appt.dr || appt.title}
                          </h5>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <BiTime className="text-primary" /> {appt.time}
                            </p>
                            <span className="text-[10px] text-slate-300">
                              •
                            </span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {appt.status}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Badge
                        label={appt.countdown}
                        status={
                          appt.status === "confirmed" ? "success" : "warning"
                        }
                        variant="soft"
                        size="sm"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {appt.location && (
                          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100">
                            <BiMap className="text-primary" /> {appt.location}
                          </div>
                        )}
                        {appt.dr_specialty && (
                          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100">
                            <BiTrendingUp className="text-emerald-500" />{" "}
                            {appt.dr_specialty}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 justify-start items-start">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">
                          Appoinment Details
                        </p>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 w-full text-[11px] font-bold text-slate-500 leading-relaxed text-left italic">
                          {appt.concern ? (
                            `"${appt.concern}"`
                          ) : (
                            <span className="italic text-slate-300">
                              No notes provided
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Carousel>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <BiCalendar size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">No upcoming events.</p>
              <p className="text-xs mt-1">Tap a date above to add one.</p>
            </div>
          )}
        </section>
      </div>

      {/* COMBINED ADD/EDIT/VIEW DAY MODAL */}
      <Modal
        isOpen={!!showAddModal}
        onClose={() => {
          setShowAddModal(null);
          setEditingId(null);
          setAddForm({
            title: "",
            time: "09:00",
            type: "appointment",
            notes: "",
            doctor: "",
            institution: "",
          });
        }}
        title={`${editingId ? "Edit" : "Day Details"} — ${showAddModal ? new Date(showAddModal).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" }) : ""}`}
      >
        <div className="space-y-6">
          {/* Existing Appointments for the day */}
          {!editingId && showAddModal && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Scheduled for this day
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {appointments.filter((a) => a.date === showAddModal).length >
                0 ? (
                  appointments
                    .filter((a) => a.date === showAddModal)
                    .map((appt) => (
                      <div
                        key={appt.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, appt.id)}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group cursor-move"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${getMarkerColor(appt.type)}`}
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {appt.title || appt.dr}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {appt.time} • {appt.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(appt)}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-primary transition-colors"
                          >
                            <BiPencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(appt)}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <BiTrash size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No events scheduled yet
                  </p>
                )}
              </div>
              <div className="h-px bg-slate-100 my-4" />
            </div>
          )}

          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {editingId ? "Modify Selection" : "Add New Event"}
            </p>

            {/* Pill Selection for Type */}
            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: "Appointment",
                  value: "appointment",
                  icon: <BiCalendar />,
                },
                {
                  label: "Reminder",
                  value: "reminder",
                  icon: <BiTrendingUp />,
                },
                { label: "Refill", value: "refill", icon: <BiLoaderAlt /> },
                { label: "Note", value: "note", icon: <BiPencil /> },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAddForm({ ...addForm, type: opt.value })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                    addForm.type === opt.value
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                      : "bg-white text-slate-500 border-slate-200 hover:border-primary/50"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            <Input
              label="Event Title / Concern"
              type="text"
              placeholder="e.g. Blood pressure check"
              value={addForm.title}
              onChange={(e) =>
                setAddForm({ ...addForm, title: e.target.value })
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Time"
                type="time"
                value={addForm.time}
                onChange={(e) =>
                  setAddForm({ ...addForm, time: e.target.value })
                }
              />
              <Select
                label="Doctor"
                value={addForm.doctor}
                onChange={(v) => setAddForm({ ...addForm, doctor: v })}
                options={doctorOptions}
                icon={<BiUser />}
              />
            </div>

            <Select
              label="Institution / Clinic"
              value={addForm.institution}
              onChange={(v) => setAddForm({ ...addForm, institution: v })}
              options={facilityOptions}
              icon={<BiBuilding />}
            />

            <Input
              label="Notes"
              textarea
              placeholder="Any details or observations..."
              value={addForm.notes}
              onChange={(e) =>
                setAddForm({ ...addForm, notes: e.target.value })
              }
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => {
                setShowAddModal(null);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              disabled={isSaving || !addForm.title.trim()}
              onClick={handleAddSubmit}
            >
              {isSaving ? (
                <BiLoaderAlt className="animate-spin mr-2" />
              ) : editingId ? (
                <BiPencil className="mr-2" />
              ) : (
                <BiPlus className="mr-2" />
              )}
              {editingId ? "Update Event" : "Save Event"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        title="Event Details"
      >
        {selectedAppointment && (
          <div className="space-y-6">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl border border-primary/5 shadow-inner">
                {selectedAppointment.img ? (
                  <img
                    src={selectedAppointment.img}
                    className="w-full h-full object-cover rounded-2xl"
                    alt=""
                  />
                ) : selectedAppointment.type === "refill" ? (
                  "💊"
                ) : selectedAppointment.type === "reminder" ? (
                  "🔔"
                ) : (
                  "📅"
                )}
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-800">
                  {selectedAppointment.dr || selectedAppointment.title}
                </h4>
                <p className="text-sm font-bold text-primary mb-1">
                  {selectedAppointment.dr_specialty || selectedAppointment.type}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge
                    label={selectedAppointment.date}
                    status="info"
                    variant="soft"
                  />
                  <Badge
                    label={selectedAppointment.time}
                    status="premium"
                    variant="soft"
                  />
                </div>
              </div>
            </div>

            {(selectedAppointment.concern || selectedAppointment.notes) && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                  "{selectedAppointment.concern || selectedAppointment.notes}"
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <BiMap className="text-primary text-lg" />
                {selectedAppointment.location || "Generic Location"}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <BiBuilding className="text-primary text-lg" />
                {selectedAppointment.institution || "Main Office"}
              </div>
            </div>

            <div className="flex gap-3">
              {isPersonalEvent(selectedAppointment) && (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => {
                      handleEdit(selectedAppointment);
                      setSelectedAppointment(null);
                    }}
                  >
                    <BiPencil className="mr-2" /> Edit
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 rounded-xl"
                    disabled={isDeleting}
                    onClick={() => handleDelete(selectedAppointment)}
                  >
                    {isDeleting ? (
                      <BiLoaderAlt className="animate-spin mr-2" />
                    ) : (
                      <BiTrash className="mr-2" />
                    )}
                    Remove
                  </Button>
                </>
              )}
              {!isPersonalEvent(selectedAppointment) && (
                <Button
                  className="flex-1 rounded-xl"
                  onClick={() => setSelectedAppointment(null)}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
