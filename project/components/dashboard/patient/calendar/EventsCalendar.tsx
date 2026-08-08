"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { BiPlus, BiLoaderAlt, BiTrendingUp, BiPencil, BiTrash } from "react-icons/bi";
import AppointmentCalendarView from "@/components/shared/Appointments/AppointmentCalendarView";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import RefillForm from "./RefillForm";
import { toast } from "react-hot-toast";
import { Appointment } from "@/lib/hooks/useAppointments";

interface AgendaItem {
  id: string;
  type: "doctor" | "refill" | "reminder" | "note" | "appointment";
  title?: string;
  dr?: string;
  field?: string;
  date: string; // e.g. "Mon Jan 01 2026"
  time: string; // e.g. "09:00 AM"
  concern?: string;
  status?: string;
}

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  refillsRemaining: number;
  expiryDate: string;
}

const EVENT_TYPES = [
  { label: "Reminder", value: "reminder", icon: <BiTrendingUp /> },
  { label: "Refill", value: "refill", icon: <BiLoaderAlt /> },
  { label: "Note", value: "note", icon: <BiPencil /> },
];

export default function EventsCalendar() {
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<
    "all" | "doctor" | "reminder" | "refill" | "note"
  >("all");

  const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add-event modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    type: "reminder" as "reminder" | "refill" | "note",
    notes: "",
    prescriptionId: "",
    deliveryMethod: "pickup" as "pickup" | "delivery",
    deliveryAddress: "",
    pharmacyId: "",
    paymentMethod: "insurance" as "insurance" | "card" | "cash",
    reminderDays: 3,
  });

  const fetchAgenda = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/patient/agenda");
      if (res.ok) setAgenda(await res.json());
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  useEffect(() => {
    if (showAddModal && addForm.type === "refill") {
      setLoadingPrescriptions(true);
      fetch("/api/patient/prescriptions")
        .then((res) => res.json())
        .then(setPrescriptions)
        .finally(() => setLoadingPrescriptions(false));
    }
  }, [showAddModal, addForm.type]);

  const prescriptionOptions = useMemo(() => {
    const opts = prescriptions.map((p) => ({
      value: p.id,
      label: `${p.medicationName} (${p.dosage}) - ${p.refillsRemaining} refills left`,
    }));
    opts.unshift({ value: "new", label: "+ Request new prescription" });
    return opts;
  }, [prescriptions]);

  const filtered = useMemo(() => {
    if (selectedType === "all") return agenda;
    if (selectedType === "doctor") return agenda.filter((a) => a.type === "doctor");
    return agenda.filter((a) => a.type === selectedType);
  }, [agenda, selectedType]);

  // Map agenda items -> Appointment shape expected by AppointmentCalendarView
  const calendarAppointments = useMemo<Appointment[]>(
    () =>
      filtered.map((item) => {
        const start = new Date(`${item.date} ${item.time}`);
        return {
          id: item.id,
          patientName: "",
          practitionerName:
            item.type === "doctor" ? item.dr : item.title || labelForType(item.type),
          scheduledStart: start.toISOString(),
          scheduledEnd: new Date(start.getTime() + 30 * 60000).toISOString(),
          computedStatus: item.status || "upcoming",
          status: item.status,
          notes: item.concern,
          specialisation: item.type === "doctor" ? item.field : item.type,
        } as unknown as Appointment;
      }),
    [filtered],
  );

  const eventById = useMemo(() => {
    const map = new Map<string, AgendaItem>();
    filtered.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [filtered]);

  const handleAppointmentClick = (appt: Appointment) => {
    const original = eventById.get(String(appt.id));
    if (original) setSelectedEvent(original);
  };

  const handleAddSubmit = async () => {
    if (!addForm.title.trim() && addForm.type !== "refill") return;
    setIsSaving(true);
    try {
      const dateStr = new Date(`${addForm.date}T00:00:00`).toDateString();
      const res = await fetch("/api/patient/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, date: dateStr }),
      });
      if (res.ok) {
        await fetchAgenda();
        setShowAddModal(false);
        setAddForm({
          title: "",
          date: new Date().toISOString().slice(0, 10),
          time: "09:00",
          type: "reminder",
          notes: "",
          prescriptionId: "",
          deliveryMethod: "pickup",
          deliveryAddress: "",
          pharmacyId: "",
          paymentMethod: "insurance",
          reminderDays: 3,
        });
        toast.success("Event added to calendar");
      } else {
        toast.error("Failed to save event");
      }
    } catch {
      toast.error("Failed to save event");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (event: AgendaItem) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/patient/agenda/${event.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAgenda();
        toast.success("Event removed");
        setSelectedEvent(null);
      }
    } catch {
      toast.error("Failed to remove event");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/patient" },
          { label: "Calendar" },
        ]}
      />

      {/* Page Header */}
      <PageHeader
        title="Events Calendar"
        subtitle="View all your appointments, reminders, refills, and notes in one place"
        right={
          <Button
            icon={<BiPlus size={18} />}
            iconPosition="left"
            onClick={() => setShowAddModal(true)}
          >
            Add Event
          </Button>
        }
      />

      {/* Type Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "doctor", "reminder", "refill", "note"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              selectedType === type
                ? "bg-primary text-white"
                : "bg-surface-soft text-ink-600 hover:bg-surface"
            }`}
          >
            {type === "doctor" ? "Appointments" : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Calendar View */}
      <Card noPadding className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-ink-600">Loading events...</div>
        ) : (
          <AppointmentCalendarView
            appointments={calendarAppointments}
            onAppointmentClick={handleAppointmentClick}
            userType="patient"
            emptyMessage="No events yet — click Add Event to create your first reminder, refill, or note."
          />
        )}
      </Card>

      {/* Event Details Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || selectedEvent?.dr || "Event Details"}
      >
        {selectedEvent && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              {new Date(`${selectedEvent.date} ${selectedEvent.time}`).toLocaleString("en-ZA", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {selectedEvent.concern && (
              <p className="text-sm text-ink-900">{selectedEvent.concern}</p>
            )}
            {selectedEvent.type !== "doctor" && (
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  icon={<BiTrash />}
                  disabled={isDeleting}
                  onClick={() => handleDelete(selectedEvent)}
                >
                  {isDeleting ? "Removing..." : "Delete"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Event Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Event"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAddForm({ ...addForm, type: opt.value as any })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                    addForm.type === opt.value
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-slate-500 border-slate-200 hover:border-primary/50"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                value={addForm.date}
                onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
              />
              <Input
                label="Time"
                type="time"
                value={addForm.time}
                onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
              />
            </div>

            {addForm.type === "reminder" && (
              <>
                <Input
                  label="Reminder Title"
                  type="text"
                  placeholder="e.g. Take medication"
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                />
                <Input
                  label="Notes (optional)"
                  textarea
                  placeholder="Additional info..."
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                />
              </>
            )}

            {addForm.type === "note" && (
              <>
                <Input
                  label="Note Title"
                  type="text"
                  placeholder="e.g. Blood pressure reading"
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                />
                <Input
                  label="Note Content"
                  textarea
                  placeholder="Write your note here..."
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                />
              </>
            )}

            {addForm.type === "refill" && (
              <RefillForm
                addForm={addForm}
                setAddForm={setAddForm}
                loadingPrescriptions={loadingPrescriptions}
                prescriptionOptions={prescriptionOptions}
              />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={isSaving || (addForm.type !== "refill" && !addForm.title.trim())}
              onClick={handleAddSubmit}
            >
              {isSaving ? <BiLoaderAlt className="animate-spin mr-2" /> : <BiPlus className="mr-2" />}
              Save Event
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function labelForType(type: string) {
  switch (type) {
    case "reminder":
      return "Reminder";
    case "refill":
      return "Refill";
    case "note":
      return "Note";
    default:
      return "Event";
  }
}
