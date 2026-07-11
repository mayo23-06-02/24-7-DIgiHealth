"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  BiCalendar,
  BiTime,
  BiCheckCircle,
  BiLoaderAlt,
  BiX,
  BiSearch,
  BiVideo,
  BiChat,
} from "react-icons/bi";
import { toast } from "react-hot-toast";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import {
  createBooking,
  updateBooking,
  formToCreateInput,
  validateBookingForm,
  fetchDaySlots,
  todayDateString,
  upcomingDateStrings,
  type BookingFormState,
  type BookingSlot,
  type ConsultationMethod,
} from "@/lib/booking";
import TimeSlotPicker from "@/components/booking/TimeSlotPicker";
import { useAuthContext } from "@/components/auth/AuthProvider";
import BookingStepIndicator from "@/components/doctor/BookingStepIndicator";

interface Doctor {
  id: string;
  name: string;
  specialisation: string;
  avatar?: string;
  schedule?: string[];
  rating?: number;
  isOnline?: boolean;
}

interface Patient {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "patient" | "practitioner";
  doctor?: Doctor | null;
  patient?: Patient | null;
  editingApptId?: string | null;
  initialForm?: {
    date?: string;
    time?: string;
    reason?: string;
    durationMinutes?: number;
    type?: string;
  };
  onSuccess?: () => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  mode = "patient",
  doctor = null,
  patient = null,
  editingApptId = null,
  initialForm,
  onSuccess,
}: BookingModalProps) {
  const isPractitionerMode = mode === "practitioner";
  const { user } = useAuthContext();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [selectedTime, setSelectedTime] = useState("");
  const [concern, setConcern] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [consultType, setConsultType] = useState("video");
  const [daySlots, setDaySlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [selectedDoctorState, setSelectedDoctorState] = useState<Doctor | null>(
    null,
  );

  const dateOptions = useMemo(() => upcomingDateStrings(14), []);

  /** Practitioner whose calendar we check for free slots */
  const slotsPractitionerId = isPractitionerMode
    ? user?.id || null
    : selectedDoctorState?.id || doctor?.id || null;
  const [availableDocs, setAvailableDocs] = useState<Doctor[]>([]);
  const [doctorSearch, setDoctorSearch] = useState("");

  const [selectedPatientState, setSelectedPatientState] =
    useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasPreSelected = isPractitionerMode ? !!patient : !!doctor;
  const totalSteps = hasPreSelected ? 3 : 4;

  const showPersonSelect = !hasPreSelected && step === 1;
  const showDateTime =
    (hasPreSelected && step === 1) || (!hasPreSelected && step === 2);
  const showConcern =
    (hasPreSelected && step === 2) || (!hasPreSelected && step === 3);
  const showConfirm =
    (hasPreSelected && step === 3) || (!hasPreSelected && step === 4);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedDate(initialForm?.date || todayDateString());
      setSelectedTime(initialForm?.time || "");
      setConcern(initialForm?.reason || "");
      setDurationMinutes(initialForm?.durationMinutes || 30);
      setConsultType(initialForm?.type || "video");
      setDoctorSearch("");
      setPatientSearch(patient?.name || "");
      setDaySlots([]);
      if (isPractitionerMode) {
        setSelectedPatientState(patient || null);
      } else {
        setSelectedDoctorState(doctor || null);
      }
    }
  }, [isOpen, doctor, patient, isPractitionerMode, initialForm]);

  // Real schedule-based slots (8am–midnight); past + booked are greyed out
  useEffect(() => {
    if (!isOpen || !showDateTime) return;
    if (!slotsPractitionerId || !selectedDate) {
      setDaySlots([]);
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    void (async () => {
      try {
        const result = await fetchDaySlots({
          practitionerId: slotsPractitionerId,
          date: selectedDate,
          durationMinutes: isPractitionerMode ? durationMinutes : 30,
          excludeBookingId: editingApptId,
        });
        if (cancelled) return;
        if (result.success && result.data?.slots) {
          setDaySlots(result.data.slots);
          // Clear selection if that slot is no longer bookable
          setSelectedTime((prev) => {
            if (!prev) return prev;
            const stillOk = result.data!.slots.some(
              (s) => s.time === prev && s.available,
            );
            return stillOk ? prev : "";
          });
        } else {
          setDaySlots([]);
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // showDateTime depends on step — listed via step + hasPreSelected
  }, [
    isOpen,
    showDateTime,
    slotsPractitionerId,
    selectedDate,
    durationMinutes,
    isPractitionerMode,
    editingApptId,
  ]);

  useEffect(() => {
    if (isOpen && !isPractitionerMode && !doctor) {
      fetch("/api/practitioners/available")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => {
          setAvailableDocs(
            data.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
              specialisation:
                doc.specialisation || doc.specialty || "Clinical Specialist",
              avatar: doc.avatar,
              rating: doc.rating,
              isOnline: doc.isOnline,
            })),
          );
        })
        .catch((err) => console.error("Available docs fetch error:", err));
    }
  }, [isOpen, doctor, isPractitionerMode]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isPractitionerMode) return;
    if (!patientSearch.trim() || selectedPatientState?.id) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setPatientLoading(true);
      try {
        const res = await fetch(
          `/api/practitioner/patients?search=${encodeURIComponent(patientSearch)}&limit=8`,
        );
        const json = await res.json();
        if (json.success) {
          setPatientResults(
            (json.data || []).map((p: any) => ({
              id: p.id || p._id,
              name:
                p.fullName ||
                `${p.firstName || ""} ${p.lastName || ""}`.trim() ||
                "Unknown Patient",
              email: p.email || p.mobile || "",
              avatar: p.avatar,
            })),
          );
        }
      } catch {
        /* silent */
      } finally {
        setPatientLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, selectedPatientState, isPractitionerMode]);

  const handleClose = () => onClose();

  const handleNext = () => {
    if (showPersonSelect) {
      const missing = isPractitionerMode
        ? !selectedPatientState
        : !selectedDoctorState;
      if (missing) {
        toast.error(
          isPractitionerMode
            ? "Please select a patient."
            : "Please select a practitioner.",
        );
        return;
      }
    }
    if (showDateTime) {
      if (!selectedTime) {
        toast.error("Please select a time slot.");
        return;
      }
      const slot = daySlots.find((s) => s.time === selectedTime);
      if (slot && !slot.available) {
        toast.error(
          slot.reason === "Past"
            ? "That time has already passed. Choose a later slot."
            : "That slot is no longer available. Choose another time.",
        );
        return;
      }
    }
    if (showConcern && !concern.trim()) {
      toast.error("Please describe the reason for this consultation.");
      return;
    }
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    const form: BookingFormState = {
      date: selectedDate,
      time: selectedTime,
      reason: concern,
      durationMinutes: isPractitionerMode ? durationMinutes : 30,
      type: (isPractitionerMode ? consultType : "video") as ConsultationMethod,
      patientId: selectedPatientState?.id,
      practitionerId: selectedDoctorState?.id,
    };

    const validation = validateBookingForm(form, {
      mode: isPractitionerMode ? "practitioner" : "patient",
      requirePerson: true,
    });
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    const input = formToCreateInput(form, {
      mode: isPractitionerMode ? "practitioner" : "patient",
      bookingId: editingApptId,
    });

    setIsSubmitting(true);
    try {
      // Unified platform booking API (works for patient + practitioner)
      const result = editingApptId
        ? await updateBooking(editingApptId, input)
        : await createBooking(input);

      if (!result.success) {
        throw new Error(result.error || "Booking failed");
      }

      toast.success(
        isPractitionerMode
          ? editingApptId
            ? "Appointment updated!"
            : "Appointment scheduled!"
          : "Appointment confirmed and synced!",
      );
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      toast.error(error?.message || "Process failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const selectedPerson = isPractitionerMode
    ? selectedPatientState
    : selectedDoctorState;
  const selectedPersonLabel = isPractitionerMode
    ? "Patient"
    : "Primary Practitioner";
  const selectedPersonName = isPractitionerMode
    ? selectedPatientState?.name || ""
    : selectedDoctorState
      ? selectedDoctorState.name.startsWith("Dr. ")
        ? selectedDoctorState.name
        : `Dr. ${selectedDoctorState.name}`
      : "";
  const selectedPersonSub = isPractitionerMode
    ? selectedPatientState?.email || "Patient"
    : selectedDoctorState?.specialisation || "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        isPractitionerMode
          ? editingApptId
            ? "Edit Clinical Appointment"
            : "Schedule New Appointment"
          : "Secure Clinical Booking"
      }
      width="md"
    >
      <div className="space-y-6 py-2 ">
        <BookingStepIndicator step={step} totalSteps={totalSteps} />

        {/* Selected person card */}
        {selectedPerson && (
          <Card className="flex items-center gap-5 bg-slate-50/50 p-5 rounded-lg border border-slate-100">
            <div className="w-14 h-14 flex items-center justify-center overflow-hidden rounded-lg shrink-0">
              {(selectedPerson as any).avatar ? (
                <img
                  src={(selectedPerson as any).avatar}
                  alt={selectedPersonName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Avatar name={selectedPersonName} size="lg" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-500 tracking-normal mb-0.5 font-grotesk">
                {selectedPersonLabel}
              </h4>
              <h4 className="font-bold text-slate-800 text-lg leading-tight tracking-tight font-grotesk">
                {selectedPersonName}
              </h4>
              <p className="text-slate-600 tracking-normal opacity-80 mt-0.5">
                {selectedPersonSub}
              </p>
            </div>
          </Card>
        )}

        {/* STEP: Person Selection */}
        {showPersonSelect && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="px-1">
              <h4 className="text-lg font-bold text-slate-800 tracking-tight mb-1 font-grotesk">
                {isPractitionerMode ? "Select Patient" : "Medical Network"}
              </h4>
              <p className="text-xs text-slate-500 font-bold tracking-normal opacity-80">
                {isPractitionerMode
                  ? "Search and select a patient from your practice."
                  : "Choose from our verified network of practitioners."}
              </p>
            </div>

            {isPractitionerMode ? (
              <div ref={dropdownRef} className="relative px-1">
                <div className="relative">
                  <BiSearch
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={15}
                  />
                  <input
                    type="text"
                    placeholder="Type to search your patients..."
                    value={patientSearch}
                    onFocus={() => {
                      if (!selectedPatientState?.id && patientSearch)
                        setShowDropdown(true);
                    }}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setSelectedPatientState(null);
                      setShowDropdown(true);
                    }}
                    className={`w-full pl-9 pr-9 py-3 border rounded-lg text-sm focus:outline-none transition-colors ${
                      selectedPatientState
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-slate-200 focus:border-primary"
                    }`}
                  />
                  {selectedPatientState && (
                    <button
                      onClick={() => {
                        setSelectedPatientState(null);
                        setPatientSearch("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <BiX size={14} />
                    </button>
                  )}
                </div>
                {showDropdown && !selectedPatientState && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-lg shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
                    {patientLoading ? (
                      <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                        <BiLoaderAlt className="animate-spin" size={14} />{" "}
                        Searching patients...
                      </div>
                    ) : patientResults.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        {patientSearch.length < 1
                          ? "Start typing to find a patient"
                          : "No matching patients found"}
                      </div>
                    ) : (
                      patientResults.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={() => {
                            setSelectedPatientState(p);
                            setPatientSearch(p.name);
                            setShowDropdown(false);
                            setPatientResults([]);
                            setStep(2);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors text-left border-b border-slate-50 last:border-0"
                        >
                          <Avatar name={p.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {p.email || "Patient"}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="px-1">
                  <Input
                    type="text"
                    placeholder="Search practitioners..."
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
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
                    .map((doc) => {
                      const isSelected = selectedDoctorState?.id === doc.id;
                      const docDisplayName = doc.name.startsWith("Dr. ")
                        ? doc.name
                        : `Dr. ${doc.name}`;
                      return (
                        <Card
                          key={doc.id}
                          onClick={() => {
                            setSelectedDoctorState(doc);
                            setStep(2);
                          }}
                          className={`group p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-none shadow-primary/10"
                              : "border-slate-100 bg-white hover:border-primary/20 hover:bg-slate-50/20"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <Avatar
                              name={doc.name}
                              src={doc.avatar}
                              size="md"
                              className="group-hover:scale-105 transition-transform duration-500 shadow-none shadow-slate-100"
                            />
                            <div className="min-w-0 flex-1">
                              <h1 className="font-bold text-slate-800 text-sm mb-0.5 truncate group-hover:text-primary transition-colors">
                                {docDisplayName}
                              </h1>
                              <p className="font-semibold text-slate-500 text-xs tracking-normal">
                                {doc.specialisation}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP: Date & Time */}
        {showDateTime && (
          <div className="space-y-6  animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-500 tracking-normal flex items-center gap-2 px-1">
                <BiCalendar size={14} className="text-primary" /> Select date
              </label>
              <div className="flex gap-2 overflow-x-auto py-3 px-1 -mx-1 custom-scrollbar">
                {dateOptions.map((dateStr) => {
                  const d = new Date(dateStr + "T12:00:00");
                  const dayName = d.toLocaleDateString("en-US", {
                    weekday: "short",
                  });
                  const dayNum = d.getDate();
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setSelectedTime("");
                      }}
                      className={`flex flex-col items-center justify-center rounded-lg border-2 transition-all duration-300 p-0 !min-w-[68px] h-[72px] ${
                        isSelected
                          ? "border-primary bg-primary text-white shadow-primary/30 scale-105"
                          : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"
                      }`}
                    >
                      <span
                        className={`text-[9px] font-bold tracking-normal ${isSelected ? "text-white/70" : "text-slate-500"}`}
                      >
                        {dayName}
                      </span>
                      <span
                        className={`text-2xl font-bold tabular-nums tracking-tighter ${isSelected ? "text-white" : "text-slate-800"}`}
                      >
                        {dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isPractitionerMode && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 tracking-wider mb-1.5 block">
                    Duration
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => {
                      setDurationMinutes(Number(e.target.value));
                      setSelectedTime("");
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 tracking-wider mb-1.5 block">
                    Method
                  </label>
                  <select
                    value={consultType}
                    onChange={(e) => setConsultType(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="video">Video Call</option>
                    <option value="chat">Chat</option>
                  </select>
                </div>
              </div>
            )}

            {!slotsPractitionerId ? (
              <p className="text-sm text-slate-500 font-medium px-1">
                Select a practitioner first to see open times.
              </p>
            ) : (
              <TimeSlotPicker
                slots={daySlots}
                selectedTime={selectedTime}
                onSelect={setSelectedTime}
                loading={slotsLoading}
                durationMinutes={isPractitionerMode ? durationMinutes : 30}
              />
            )}
          </div>
        )}

        {/* STEP: Reason */}
        {showConcern && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 tracking-normal flex items-center gap-2 px-1">
                <BiCheckCircle size={14} className="text-primary" /> Reason for
                Consultation
              </label>
              <div className="relative">
                <Input
                  isTextArea
                  placeholder="Briefly describe the clinical symptoms or reason for this consultation..."
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  className="w-full h-40 rounded-lg bg-slate-50/50 border border-slate-100 p-4 text-slate-700 focus:outline-none focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all resize-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP: Confirm */}
        {showConfirm && selectedPerson && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-slate-50/50 rounded-lg p-6 space-y-4 border border-slate-100">
              <h4 className="text-sm font-bold text-slate-500 tracking-normal uppercase">
                Booking Summary
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 tracking-wide">
                    {isPractitionerMode ? "Patient" : "Practitioner"}
                  </p>
                  <p className="font-bold text-slate-800">
                    {selectedPersonName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 tracking-wide">
                    {isPractitionerMode ? "Contact" : "Specialisation"}
                  </p>
                  <p className="font-bold text-slate-800">
                    {selectedPersonSub}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 tracking-wide">
                    Date
                  </p>
                  <p className="font-bold text-slate-800">
                    {formatDate(selectedDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 tracking-wide">
                    Time
                  </p>
                  <p className="font-bold text-slate-800">{selectedTime}</p>
                </div>
                {isPractitionerMode && (
                  <>
                    <div>
                      <p className="text-xs font-bold text-slate-400 tracking-wide">
                        Duration
                      </p>
                      <p className="font-bold text-slate-800">
                        {durationMinutes} min
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 tracking-wide">
                        Method
                      </p>
                      <p className="font-bold text-slate-800 capitalize">
                        {consultType}
                      </p>
                    </div>
                  </>
                )}
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold text-slate-400 tracking-wide">
                    Reason for Consultation
                  </p>
                  <p className="font-bold text-slate-800 break-words">
                    {concern}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
              <BiCheckCircle
                className="text-emerald-600 shrink-0 mt-0.5"
                size={20}
              />
              <p className="text-sm font-bold text-emerald-700">
                {isPractitionerMode
                  ? "You are about to schedule this appointment. The patient will be notified."
                  : "You are about to confirm this appointment. A confirmation notification will be sent to your registered email and the practitioner will be notified."}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex pb-16 lg:pb-0 flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
          {step > 1 ? (
            <Button
              variant="ghost"
              onClick={handlePrev}
              icon={<FaArrowLeft size={16} />}
              iconPosition="left"
            >
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              icon={<FaArrowRight size={16} />}
              iconPosition="right"
              fullWidth
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-12 rounded-lg text-sm font-bold tracking-normal bg-emerald-500 text-white shadow-emerald-300"
              icon={
                isSubmitting ? (
                  <BiLoaderAlt className="animate-spin" size={18} />
                ) : (
                  <BiCheckCircle size={18} />
                )
              }
              iconPosition="right"
              fullWidth
            >
              {isSubmitting
                ? "Confirming..."
                : editingApptId
                  ? "Save Changes"
                  : "Confirm Appointment"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
