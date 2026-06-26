"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BiCalendar,
  BiTime,
  BiVideo,
  BiMessageDetail,
  BiSearch,
  BiListUl,
  BiChevronRight,
  BiDownload,
  BiStar,
  BiTrash,
  BiCalendarEdit,
  BiCheckShield,
  BiPlus,
  BiCheckCircle,
  BiXCircle,
  BiFile,
  BiUser,
  BiUserPlus,
} from "react-icons/bi";
import { StarIcon, VerifiedIcon } from "lucide-react";
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
import DoctorProfileModal from "./DoctorProfileModal";

type AppointmentStatus = "upcoming" | "past" | "cancelled";
type ViewType = "list" | "calendar";

interface Appointment {
  id: string;
  title: string;
  time: string;
  duration: string;
  color: string;
  doctor: string;
  practitionerId?: string;
  doctorAvatar?: string;
  specialization?: string;
  type: "video" | "chat" | "in_person";
  status: string;
  date: string;
  scheduledStartTime: string;
  description?: string;
  reason?: string;
  cancelledBy?: string;
}

// ─── Helper: check if a given time slot is in the past (only for today) ───
const isSlotPast = (slot: string, selectedDate: string) => {
  const today = new Date().toISOString().split("T")[0];
  if (selectedDate !== today) return false;
  const now = new Date();
  const [hours, minutes] = slot.split(":").map(Number);
  const slotDate = new Date();
  slotDate.setHours(hours, minutes, 0, 0);
  return slotDate < now;
};

const AppointmentsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppointmentStatus>("upcoming");
  const [viewType, setViewType] = useState<ViewType>("list");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [selectedPractitioner, setSelectedPractitioner] = useState<any | null>(
    null,
  );
  const [showBookingWizard, setShowBookingWizard] = useState(false);

  // Booking Wizard State
  const [bookingStep, setBookingStep] = useState(1);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [bookingData, setBookingData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: "",
    type: "video",
    reason: "",
  });

  const [counts, setCounts] = useState({ upcoming: 0, past: 0, cancelled: 0 });

  // ─── HARDCODED SCHEDULE: all doctors open 08:00 – 23:50 (10‑minute slots) ───
  const allTimeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 8; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        slots.push(
          `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        );
      }
    }
    // Add 23:50 is already included, we don't need 24:00
    return slots;
  }, []);

  // All doctors have the same availability: allTimeSlots
  const availableSlotsForDoctor = useMemo(() => {
    return allTimeSlots; // no filtering per doctor
  }, [allTimeSlots]);

  useEffect(() => {
    fetchAppointments();
  }, [activeTab]);

  useEffect(() => {
    if (showBookingWizard) {
      fetch("/api/practitioners/available")
        .then((res) => {
          if (!res.ok)
            return res.text().then((t) => {
              throw new Error(t);
            });
          return res.json();
        })
        .then(setAvailableDocs)
        .catch((err) => console.error("Available docs fetch error:", err));
    }
  }, [showBookingWizard]);

  const handleBookAppointment = async () => {
    // Validate selected time
    if (!bookingData.time) {
      alert("Please select a time.");
      return;
    }
    if (isSlotPast(bookingData.time, bookingData.date)) {
      alert("Cannot book a time that has already passed.");
      return;
    }

    try {
      const res = await fetch("/api/consultations/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practitionerId: selectedDoc.id,
          ...bookingData,
        }),
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
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text.substring(0, 100)}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setAppointments(data);
        setCounts((prev) => ({ ...prev, [activeTab]: data.length }));
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
    let list = appointments.filter((a) => {
      const matchesGeneral =
        a.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDoctor =
        doctorSearch === "" ||
        a.doctor.toLowerCase().includes(doctorSearch.toLowerCase()) ||
        (a.specialization &&
          a.specialization.toLowerCase().includes(doctorSearch.toLowerCase()));
      return matchesGeneral && matchesDoctor;
    });

    if (sortBy === "newest") {
      list.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    } else if (sortBy === "oldest") {
      list.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    }

    return list;
  }, [appointments, searchQuery, doctorSearch, sortBy]);

  const handleJoinCell = (appt: Appointment) => {
    console.log("Joining consultation...");
  };

  const handleReschedule = (appt: Appointment) => {
    console.log("Rescheduling...");
  };
  const handleCancel = (appt: Appointment) => {
    console.log("Cancelling...");
  };

  const handleDoctorClick = async (practitionerId: string) => {
    if (!practitionerId) return;
    try {
      const res = await fetch(`/api/patient/practitioners/${practitionerId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPractitioner(data);
      }
    } catch (err) {
      console.error("Fetch Doctor Error:", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* HEADER */}
      <PageHeader
        title="Clinical Appointments"
        subtitle="Manage your scheduled consultations and medical history."
        right={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="hidden sm:flex"
              icon={<BiDownload />}
              iconPosition="left"
            >
              Export History
            </Button>
            <Button
              onClick={() => setShowBookingWizard(true)}
              icon={<BiPlus />}
              iconPosition="left"
            >
              Book New
            </Button>
          </div>
        }
      />

      {/* TABS & TOOLS */}
      <Card className="flex flex-col gap-4 border border-slate-100 sticky top-0 z-30 p-3">
        <div className="flex flex-wrap gap-1.5 bg-slate-50 rounded-2xl p-1">
          {(["upcoming", "past", "cancelled"] as const).map((tab) => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              variant={activeTab === tab ? "primary" : "ghost"}
              className={`px-4 py-2 h-auto text-[11px] font-bold tracking-normal rounded-xl transition-all flex items-center gap-1 ${
                activeTab === tab
                  ? "shadow-primary/20"
                  : "text-slate-500 hover:text-slate-600"
              }`}
            >
              {tab}
              <span
                className={`ml-1 px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                  activeTab === tab
                    ? "bg-white/20 border-white/20 text-white"
                    : "bg-white border-slate-100 text-slate-500"
                }`}
              >
                {counts[tab]}
              </span>
            </Button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex flex-wrap gap-2 items-center">
            <Select
              value={sortBy}
              onChange={(v) => setSortBy(v)}
              options={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
              ]}
              className="w-36"
            />
            <Input type="date" className="w-40" />
          </div>
          <div className="flex flex-1 flex-wrap gap-2 items-center">
            <div className="flex-1 min-w-[160px]">
              <Input
                type="text"
                placeholder="Search by doctor..."
                icon={<BiUser size={18} />}
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <Input
                type="text"
                placeholder="Search all fields..."
                icon={<BiSearch size={18} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/50 self-start sm:self-auto">
            <Button
              variant="ghost"
              onClick={() => setViewType("list")}
              className={`w-10 h-10 p-0 rounded-xl border-none !min-w-0 transition-all ${
                viewType === "list"
                  ? "bg-white shadow-none text-primary"
                  : "text-slate-500 hover:text-slate-600"
              }`}
            >
              <BiListUl size={20} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setViewType("calendar")}
              className={`w-10 h-10 p-0 rounded-xl border-none !min-w-0 transition-all ${
                viewType === "calendar"
                  ? "bg-white shadow-none text-primary"
                  : "text-slate-500 hover:text-slate-600"
              }`}
            >
              <BiCalendar size={20} />
            </Button>
          </div>
        </div>
      </Card>

      {/* APPOINTMENTS LIST */}
      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 border-[5px] border-primary/10 border-t-primary rounded-full animate-spin" />
          <p className="text-slate-500 font-bold text-sm tracking-normal">
            Syncing Encrypted Clinical Data...
          </p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card className="p-12 border-dashed border-2 border-slate-100 bg-slate-50/30">
          <EmptyState
            title={`No ${activeTab} Consultations`}
            description="All verified clinical sessions scheduled via 24/7 DigiHealth will be organized here."
            icon={<BiCalendar size={48} className="text-slate-200" />}
          />
        </Card>
      ) : viewType === "calendar" ? (
        <div className="h-[800px] w-full mt-4 bg-white rounded-lg border border-slate-100 shadow-none shadow-slate-900/5 overflow-hidden">
          <PatientCalendar />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <Card
            className="hidden md:block p-0 overflow-hidden border border-slate-100 shadow-none shadow-slate-900/5 rounded-lg"
            variant="solid"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b font-semibold border-slate-100 text-sm text-slate-500 tracking-normal">
                    <th className="px-6 py-5">Medical Specialist</th>
                    <th className="px-6 py-5">Timeline Details</th>
                    <th className="px-6 py-5">Consultation Type</th>
                    <th className="px-6 py-5">Clinical Status</th>
                    <th className="px-6 py-5 text-right">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAppointments.map((appt) => (
                    <tr
                      key={appt.id}
                      className="hover:bg-primary/[0.02] transition-colors group cursor-default"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <Avatar
                            name={appt.doctor}
                            size="md"
                            className="shadow-none shadow-slate-200"
                          />
                          <div>
                            <h1
                              className="font-bold text-slate-800 text-sm leading-none mb-1 cursor-pointer hover:text-primary transition-all underline-offset-4 decoration-2"
                              onClick={() =>
                                appt.practitionerId &&
                                handleDoctorClick(appt.practitionerId)
                              }
                            >
                              {appt.doctor}
                            </h1>
                            <p className="text-sm text-slate-600 tracking-normal opacity-80">
                              {appt.specialization || "Clinical specialist"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1.5">
                          <p className="text-sm font-bold text-slate-700 tracking-tight">
                            {appt.date}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-slate-600 tracking-normal">
                            <BiTime size={14} className="text-slate-500" />
                            {appt.time} <span className="opacity-50">·</span>{" "}
                            {appt.duration}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge
                          label={appt.type.replace("_", " ")}
                          status="info"
                          variant="soft"
                          className="text-sm font-bold tracking-normal px-3 py-1"
                        />
                      </td>
                      <td className="px-6 py-5">
                        <Badge
                          label={appt.status}
                          status={
                            appt.status === "scheduled"
                              ? "warning"
                              : appt.status === "completed"
                                ? "success"
                                : "error"
                          }
                          variant="solid"
                          className="uppercase text-xs font-bold"
                        />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          {activeTab === "upcoming" && (
                            <Button
                              size="sm"
                              className="h-10 px-4 rounded-xl text-sm font-bold tracking-normal bg-emerald-500 hover:bg-emerald-600 shadow-none shadow-emerald-100"
                              onClick={() => handleJoinCell(appt)}
                              icon={<BiVideo size={14} />}
                            >
                              Join Room
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            onClick={() => setSelectedAppt(appt)}
                            className="w-10 h-10 p-0 rounded-xl flex items-center justify-center bg-slate-50 hover:bg-primary/5 text-slate-500 hover:text-primary transition-all border-none !min-w-0"
                          >
                            <BiChevronRight size={22} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {filteredAppointments.map((appt) => (
              <Card
                key={appt.id}
                className="p-4 border border-slate-100 rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <Avatar
                    name={appt.doctor}
                    size="md"
                    className="shadow-none shadow-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3
                          className="font-bold text-slate-800 text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={() =>
                            appt.practitionerId &&
                            handleDoctorClick(appt.practitionerId)
                          }
                        >
                          {appt.doctor}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {appt.specialization || "Clinical specialist"}
                        </p>
                      </div>
                      <Badge
                        label={appt.status}
                        status={
                          appt.status === "scheduled"
                            ? "warning"
                            : appt.status === "completed"
                              ? "success"
                              : "error"
                        }
                        variant="solid"
                        className="uppercase text-[9px] font-bold"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <BiCalendar size={12} />
                        {appt.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <BiTime size={12} />
                        {appt.time}
                      </span>
                      <Badge
                        label={appt.type.replace("_", " ")}
                        status="info"
                        variant="soft"
                        className="text-[10px] font-bold px-2 py-0.5"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeTab === "upcoming" && (
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600"
                          onClick={() => handleJoinCell(appt)}
                          icon={<BiVideo size={12} />}
                        >
                          Join
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAppt(appt)}
                        className="h-8 px-3 text-xs font-bold rounded-xl border border-slate-200"
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* APPOINTMENT MODAL */}
      <Modal
        isOpen={!!selectedAppt}
        onClose={() => setSelectedAppt(null)}
        title={
          activeTab === "upcoming"
            ? "Consultation Management"
            : "Clinical Session Summary"
        }
        width="md"
      >
        {selectedAppt && (
          <div className="space-y-6 py-2">
            <div className="flex flex-col sm:flex-row gap-5 items-center p-4 sm:p-6 bg-slate-50/50 rounded-lg border border-slate-100">
              <Avatar
                src={selectedAppt.doctorAvatar}
                name={selectedAppt.doctor}
                size="xl"
                className="shadow-none shadow-slate-200"
              />
              <div className="flex-1 text-center sm:text-left">
                <h4 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight leading-tight mb-1 font-grotesk">
                  {selectedAppt.doctor}
                </h4>
                <p className="text-primary font-bold tracking-normal text-sm mb-3 opacity-80">
                  {selectedAppt.specialization || "Clinical Specialist"}
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <Badge
                    label={selectedAppt.date}
                    status="info"
                    variant="soft"
                    className="font-bold text-[9px]"
                  />
                  <Badge
                    label={selectedAppt.time}
                    status="premium"
                    variant="soft"
                    className="font-bold text-[9px]"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 rounded-lg space-y-4 bg-white border border-slate-100">
              <div>
                <h6 className="text-sm font-bold text-slate-500 tracking-normal mb-2 flex items-center gap-2 font-grotesk">
                  <BiMessageDetail size={14} /> Chief Complaint
                </h6>
                <p className="text-sm font-bold text-slate-600 italic leading-relaxed pl-4 border-l-2 border-primary/20">
                  "
                  {selectedAppt.description ||
                    "Routing clinical follow-up regarding treatment plan and progress."}
                  "
                </p>
              </div>
              {activeTab === "cancelled" && (
                <div className="pt-4 border-t border-slate-100">
                  <h6 className="text-sm font-bold text-rose-400 tracking-normal mb-2 flex items-center gap-2 font-grotesk">
                    <BiXCircle size={14} /> Cancellation Intel
                  </h6>
                  <p className="text-sm font-bold text-rose-600 pl-4 border-l-2 border-rose-200">
                    {selectedAppt.reason ||
                      "Patient scheduling conflict identified."}
                  </p>
                  <p className="text-sm text-rose-400 font-bold mt-2 pl-4 tracking-normal opacity-60">
                    Authority: {selectedAppt.cancelledBy || "Patient"}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {activeTab === "upcoming" ? (
                <>
                  <Button
                    fullWidth
                    className="h-14 sm:h-16 justify-between px-6 bg-primary hover:bg-primary/95 text-white shadow-none shadow-primary/20 rounded-2xl"
                    onClick={() => handleJoinCell(selectedAppt)}
                    icon={<BiVideo size={20} />}
                    iconPosition="right"
                  >
                    <span className="text-sm font-bold tracking-normal">
                      Launch Virtual Consulting Room
                    </span>
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-12 border-slate-100 text-[11px] font-bold tracking-normal rounded-2xl hover:bg-slate-50"
                      onClick={() => handleReschedule(selectedAppt)}
                      icon={<BiCalendarEdit size={16} />}
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-12 bg-rose-50 hover:bg-rose-100 text-rose-500 text-[11px] font-bold tracking-normal rounded-2xl border-none"
                      onClick={() => handleCancel(selectedAppt)}
                      icon={<BiTrash size={16} />}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : activeTab === "past" ? (
                <>
                  <Button
                    fullWidth
                    className="h-14 sm:h-16 justify-between px-6 bg-emerald-500 hover:bg-emerald-600 text-white shadow-none shadow-emerald-100 rounded-2xl"
                    icon={<BiFile size={20} />}
                    iconPosition="right"
                  >
                    <span className="text-[11px] font-bold tracking-normal">
                      Download Clinical Briefing (PDF)
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 justify-between px-6 border-slate-100 rounded-2xl hover:bg-slate-50"
                  >
                    <span className="text-[11px] font-bold tracking-normal text-slate-600">
                      View Encrypted SOAP Logs
                    </span>
                    <BiCheckShield size={18} className="text-primary" />
                  </Button>
                  <div className="pt-6 border-t border-slate-100">
                    <h6 className="text-center text-sm font-bold text-slate-300 tracking-normal mb-4 font-grotesk">
                      Practitioner Feedback Efficiency
                    </h6>
                    <div className="flex justify-center gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Button
                          key={s}
                          variant="ghost"
                          className="w-12 h-12 sm:w-14 sm:h-14 p-0 bg-slate-50 hover:text-gray-400 hover:bg-gray-50 rounded-2xl border-none transition-all duration-300 transform hover:scale-110 active:scale-90"
                        >
                          <BiStar
                            size={22}
                            className={
                              s <= 4
                                ? "fill-gray-400 text-gray-400"
                                : "text-slate-300"
                            }
                          />
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <Button
                  fullWidth
                  className="h-14 shadow-none shadow-primary/20 rounded-2xl text-sm font-bold tracking-normal"
                >
                  Book Clinical Re-appointment
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* BOOKING WIZARD MODAL */}
      <Modal
        isOpen={showBookingWizard}
        onClose={() => setShowBookingWizard(false)}
        title={
          bookingStep === 1
            ? "Select Clinical Provider"
            : "Appointment Intelligence"
        }
        width="lg"
      >
        <div className="space-y-6 py-2">
          {bookingStep === 1 ? (
            <div className="space-y-6">
              <div className="px-2">
                <h4 className="text-xl font-bold text-slate-800 tracking-tight mb-1 font-grotesk">
                  Medical Network
                </h4>
                <p className="text-[11px] text-slate-500 font-bold tracking-normal opacity-80">
                  Choose from our verified network of practitioners.
                </p>
              </div>
              <div className="px-2">
                <Input
                  type="text"
                  placeholder="Search practitioners..."
                  icon={<BiUserPlus size={18} />}
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {availableDocs
                  .filter(
                    (doc) =>
                      doc.name
                        .toLowerCase()
                        .includes(doctorSearch.toLowerCase()) ||
                      doc.specialisation
                        .toLowerCase()
                        .includes(doctorSearch.toLowerCase()),
                  )
                  .map((doc) => (
                    <Card
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setBookingStep(2);
                      }}
                      className={`group p-4 sm:p-6 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                        selectedDoc?.id === doc.id
                          ? "border-primary bg-primary/5 shadow-none shadow-primary/10"
                          : "border-slate-50 hover:border-primary/20 hover:bg-white hover:shadow-none hover:shadow-slate-900/5"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar
                          name={doc.name}
                          size="lg"
                          status={doc.isOnline ? "online" : "offline"}
                          className="group-hover:scale-110 transition-transform duration-500 shadow-none shadow-slate-100"
                        />
                        <div className="min-w-0 flex-1">
                          <h1 className="font-bold text-slate-800 text-base mb-0.5 truncate flex items-center gap-1 group-hover:text-primary transition-colors">
                            {doc.name}
                            <VerifiedIcon
                              fill="#4493b8"
                              className="w-4 h-4 text-white"
                            />
                          </h1>
                          <p className="uppercase font-semibold text-primary/80 text-xs tracking-normal">
                            {doc.specialisation}
                          </p>
                          <div className="flex items-center gap-1.5 pt-1">
                            <div className="flex -space-x-0.5">
                              {[...Array(5)].map((_, i) => (
                                <StarIcon
                                  key={i}
                                  fill={
                                    i < Math.floor(doc.rating || 4.9)
                                      ? "#2285a7"
                                      : "transparent"
                                  }
                                  stroke={
                                    i < Math.floor(doc.rating || 4.9)
                                      ? "#2285a7"
                                      : "#cbd5e1"
                                  }
                                  className="w-3 h-3"
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-slate-600 ml-0.5">
                              {doc.rating ? doc.rating.toFixed(1) : "4.9"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 bg-slate-50/50 border border-slate-100 rounded-lg shadow-inner">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={selectedDoc.avatar}
                    name={selectedDoc.name}
                    size="lg"
                    className="shadow-none shadow-slate-200"
                  />
                  <div>
                    <p className="font-bold text-slate-800 text-sm tracking-tight">
                      {selectedDoc.name}
                    </p>
                    <p className="text-sm font-bold text-slate-500 tracking-normal mt-0.5">
                      {selectedDoc.specialisation}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setBookingStep(1)}
                  className="text-sm font-bold text-primary tracking-normal border-none hover:bg-primary/5 transition-all px-4 rounded-xl"
                  icon={<BiPlus className="rotate-45" size={14} />}
                >
                  Change
                </Button>
              </Card>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    type="date"
                    label="Clinical Preference Date"
                    value={bookingData.date}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, date: e.target.value })
                    }
                  />
                </div>

                {/* ─── TIME SELECTION (Clock + Quick Picks) ─── */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="text-sm font-bold text-slate-700 w-40">
                      Select Time
                    </label>
                    <input
                      type="time"
                      min="08:00"
                      max="23:59"
                      value={bookingData.time}
                      onChange={(e) =>
                        setBookingData({ ...bookingData, time: e.target.value })
                      }
                      className="w-full sm:w-48 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary outline-none transition-all text-slate-900 font-medium"
                    />
                  </div>

                  {/* Quick-select available slots (hardcoded 08:00 – 23:50) */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 tracking-wider px-1">
                      Available slots (click to set time)
                    </p>
                    <div className="max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                      <div className="flex flex-wrap gap-2">
                        {availableSlotsForDoctor.map((slot) => {
                          const past = isSlotPast(slot, bookingData.date);
                          const selected = bookingData.time === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={past}
                              onClick={() =>
                                !past &&
                                setBookingData({ ...bookingData, time: slot })
                              }
                              className={`
                                px-4 py-2 text-xs font-bold rounded-xl border-2 transition-all
                                ${
                                  past
                                    ? "opacity-30 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
                                    : ""
                                }
                                ${
                                  selected && !past
                                    ? "bg-primary text-white border-primary shadow-primary/20"
                                    : ""
                                }
                                ${
                                  !selected && !past
                                    ? "bg-white border-slate-200 text-slate-600 hover:border-primary/40 hover:bg-primary/5"
                                    : ""
                                }
                              `}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {bookingData.time &&
                    isSlotPast(bookingData.time, bookingData.date) && (
                      <p className="text-xs text-rose-500 font-bold flex items-center gap-1">
                        <BiXCircle /> This time has already passed. Please
                        choose a future time.
                      </p>
                    )}
                </div>

                <Input
                  isTextArea
                  label="Chief Complaint Intel"
                  rows={4}
                  placeholder="Describe your current clinical symptoms, duration, and any relevant history for the specialist to review before the session."
                  value={bookingData.reason}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, reason: e.target.value })
                  }
                  className=""
                />

                <Button
                  fullWidth
                  className="h-14 sm:h-16 shadow-none shadow-primary/30 rounded-[1.5rem] bg-primary hover:bg-primary/95 text-white"
                  disabled={!bookingData.time || !bookingData.reason}
                  onClick={handleBookAppointment}
                  icon={<BiCheckCircle size={20} />}
                >
                  <span className="text-sm font-bold tracking-normal">
                    Confirm Clinical Session
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* DOCTOR PROFILE MODAL */}
      <DoctorProfileModal
        isOpen={!!selectedPractitioner}
        onClose={() => setSelectedPractitioner(null)}
        doctor={selectedPractitioner}
        onBook={() => {}}
        onMessage={(id) => (window.location.href = "/patient/messages")}
      />
    </div>
  );
};

export default AppointmentsView;
