"use client";
import React, { useState, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  BiCalendar,
  BiTime,
  BiCheckCircle,
  BiLoaderAlt,
  BiUser,
  BiBuilding,
  BiX,
} from "react-icons/bi";
import { toast } from "react-hot-toast";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";

interface Doctor {
  id: string;
  name: string;
  specialisation: string;
  avatar?: string;
  schedule?: string[];
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  onSuccess?: () => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  doctor,
  onSuccess,
}: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedTime, setSelectedTime] = useState("");
  const [concern, setConcern] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default mock times if doctor has none
  const availableTimes = doctor?.schedule || [
    "09:00 AM",
    "10:30 AM",
    "01:00 PM",
    "02:30 PM",
    "04:00 PM",
  ];

  const handleSubmit = async () => {
    if (!doctor || !selectedTime || !concern.trim()) {
      toast.error("Please fill in all clinical details");
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert "02:30 PM" to "14:30"
      const convertTo24Hour = (timeStr: string) => {
        const [time, modifier] = timeStr.split(" ");
        let [hours, minutes] = time.split(":");
        if (hours === "12") hours = "00";
        if (modifier === "PM") hours = (parseInt(hours, 10) + 12).toString();
        return `${hours.padStart(2, "0")}:${minutes}`;
      };

      const res = await fetch("/api/consultations/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practitionerId: doctor.id,
          date: selectedDate,
          time: selectedTime.includes(" ")
            ? convertTo24Hour(selectedTime)
            : selectedTime,
          type: "video",
          chiefComplaint: concern,
        }),
      });

      if (res.ok) {
        toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
          loading: "Synchronizing with clinical calendar...",
          success: "Appointment confirmed and synced!",
          error: "Failed to sync",
        });
        onSuccess?.();
        onClose();
        // Reset form
        setConcern("");
        setSelectedTime("");
      } else {
        throw new Error("Failed to book");
      }
    } catch (error) {
      toast.error("Process failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!doctor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure Clinical Booking"
      width="md"
    >
      <div className="space-y-8 py-2">
        {/* Practitioner Context */}
        <Card className="flex items-center gap-5 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
          <div className="w-16 h-16 flex items-center justify-center overflow-hidden rounded-2xl shadow-none shadow-primary/10 shrink-0 relative z-10">
            {doctor.avatar ? (
              <img
                src={doctor.avatar}
                alt={doctor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Avatar name={doctor.name} size="lg" />
            )}
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <h4 className="text-[10px] font-bold text-slate-400  tracking-normal mb-1.5 px-0.5 font-grotesk">
              Primary Practitioner
            </h4>
            <h4 className="font-bold text-slate-800 text-lg leading-tight tracking-tight  font-grotesk">
              Dr. {doctor.name}
            </h4>
            <p className="text-[10px] font-bold text-primary  tracking-normal opacity-80 mt-1">
              {doctor.specialisation}
            </p>
          </div>
        </Card>

        {/* Clinical Date Selection */}
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-slate-400  tracking-normal flex items-center gap-2 px-1">
            <BiCalendar size={14} className="text-primary" /> Selection Period:
            April 2026
          </label>
          <div className="flex gap-3 overflow-x-auto pb-6 px-1 -mx-4 custom-scrollbar-hide">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((offset) => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              const dateStr = d.toISOString().split("T")[0];
              const dayName = d.toLocaleDateString("en-US", {
                weekday: "short",
              });
              const dayNum = d.getDate();
              const isSelected = selectedDate === dateStr;
              return (
                <Button
                  key={dateStr}
                  variant={isSelected ? "primary" : "ghost"}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center justify-center min-w-[72px] h-28 rounded-2xl border transition-all duration-500 p-0 !min-w-[72px] space-y-1 border-none ${
                    isSelected
                      ? "shadow-none shadow-primary/30 scale-110 z-10"
                      : "bg-slate-50 text-slate-400 hover:bg-white hover:shadow-none hover:shadow-slate-900/5"
                  }`}
                >
                  <span
                    className={`text-[9px] font-bold  tracking-normal ${isSelected ? "text-white/70" : "text-slate-400 opacity-60"}`}
                  >
                    {dayName}
                  </span>
                  <span
                    className={`text-2xl font-bold tabular-nums tracking-tighter ${isSelected ? "text-white" : "text-slate-800"}`}
                  >
                    {dayNum}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Time Slot Selection */}
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-slate-400  tracking-normal flex items-center gap-2 px-1">
            <BiTime size={14} className="text-primary" /> Available Clinical
            Intelligence Windows
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableTimes.map((time) => (
              <Button
                key={time}
                variant={selectedTime === time ? "primary" : "ghost"}
                onClick={() => setSelectedTime(time)}
                className={`py-4 h-auto rounded-2xl text-[11px] font-bold tracking-normal  transition-all duration-300 !min-w-0 border-none ${
                  selectedTime === time
                    ? "shadow-none shadow-primary/30 scale-105"
                    : "bg-slate-50 text-slate-500 hover:text-primary hover:bg-white hover:shadow-none"
                }`}
              >
                {time}
              </Button>
            ))}
          </div>
        </div>

        {/* clinical Concern */}
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-slate-400  tracking-normal flex items-center gap-2 px-1">
            <BiCheckCircle size={14} className="text-primary" /> Clinical
            Concern / Chief Complaint
          </label>
          <div className="relative">
            <textarea
              placeholder="Briefly describe the clinical symptoms or reason for this consultation..."
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              className="w-full h-40 rounded-[2rem] bg-slate-50/50 border border-slate-100 p-8 text-sm font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-primary/20 focus:ring-8 focus:ring-primary/5 transition-all resize-none placeholder:text-slate-300 shadow-inner"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            fullWidth
            className="h-16 rounded-[1.5rem] bg-slate-50 text-slate-400 text-[11px] font-bold  tracking-normal hover:bg-rose-50 hover:text-rose-500 transition-all border-none"
          >
            Abort Booking
          </Button>
          <Button
            disabled={isSubmitting || !selectedTime || !concern.trim()}
            onClick={handleSubmit}
            icon={
              isSubmitting ? (
                <BiLoaderAlt className="animate-spin" size={20} />
              ) : (
                <BiCalendar size={20} />
              )
            }
            iconPosition="right"
            fullWidth
            className={`h-16 rounded-[1.5rem] text-[11px] font-bold  tracking-normal shadow-none transition-all ${!selectedTime || !concern.trim() ? "bg-slate-100 text-slate-400" : "bg-primary text-white shadow-primary/30"}`}
          >
            {isSubmitting ? "Syncing Clinical Data..." : "Finalize Appointment"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
