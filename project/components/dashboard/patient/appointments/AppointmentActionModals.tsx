"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { BiCalendarEdit, BiTrash } from "react-icons/bi";
import type { Appointment } from "./types";

interface WaitingRoomProps {
  appt: Appointment | null;
  timeLeft: { hours: number; minutes: number; seconds: number };
  onClose: () => void;
}

export function WaitingRoomModal({ appt, timeLeft, onClose }: WaitingRoomProps) {
  if (!appt) return null;
  const hh = String(timeLeft.hours).padStart(2, "0");
  const mm = String(timeLeft.minutes).padStart(2, "0");
  const ss = String(timeLeft.seconds).padStart(2, "0");

  return (
    <Modal isOpen={!!appt} onClose={onClose} title="Clinical Waiting Room" width="md">
      <div className="space-y-6 text-center py-2">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar
              src={appt.doctorAvatar}
              name={appt.doctor}
              size="xl"
              className="border-4 border-primary/10 shadow-lg"
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-[3px] border-white rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 font-grotesk">
              {appt.doctor}
            </h3>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">
              {appt.specialization || "Clinical Specialist"}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-6 shadow-inner space-y-4">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
            Session Starts In
          </p>
          <div className="flex justify-center items-end gap-3">
            {(
              [
                [hh, "Hrs"],
                [mm, "Min"],
                [ss, "Sec"],
              ] as const
            ).map(([val, label], i) => (
              <React.Fragment key={label}>
                {i > 0 && (
                  <span className="text-4xl font-extrabold text-slate-300 mb-5">
                    :
                  </span>
                )}
                <div className="flex flex-col items-center">
                  <span
                    className={`text-4xl font-extrabold tabular-nums tracking-tighter ${
                      label === "Min" ? "text-primary" : "text-slate-800"
                    }`}
                  >
                    {val}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                    {label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium pt-2 border-t border-slate-100">
            You will be automatically redirected to the consultation room when
            the session begins.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
          <span className="text-xs font-bold text-emerald-700">
            Secure encrypted line active — standby
          </span>
        </div>

        <Button
          variant="ghost"
          fullWidth
          onClick={onClose}
          className="h-12 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg font-bold text-sm tracking-normal"
        >
          Return to Dashboard
        </Button>
      </div>
    </Modal>
  );
}

interface RescheduleProps {
  appt: Appointment | null;
  date: string;
  time: string;
  loading: boolean;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function RescheduleModal({
  appt,
  date,
  time,
  loading,
  onDateChange,
  onTimeChange,
  onClose,
  onConfirm,
}: RescheduleProps) {
  return (
    <Modal
      isOpen={!!appt}
      onClose={onClose}
      title="Reschedule Appointment"
      width="sm"
    >
      {appt && (
        <div className="space-y-5 py-2">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <Avatar src={appt.doctorAvatar} name={appt.doctor} size="md" />
            <div>
              <p className="font-bold text-slate-800 text-sm">{appt.doctor}</p>
              <p className="text-xs text-slate-500 font-medium">
                {appt.specialization || "Clinical Specialist"}
              </p>
            </div>
          </div>

          <Input
            type="date"
            label="New Date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">New Time</label>
            <input
              type="time"
              min="08:00"
              max="23:30"
              step="1800"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-primary outline-none transition-all text-slate-900 font-medium text-sm"
            />
          </div>

          <Button
            fullWidth
            className="h-13 rounded-lg font-bold text-sm tracking-normal"
            disabled={!date || !time || loading}
            onClick={onConfirm}
            icon={<BiCalendarEdit size={18} />}
          >
            {loading ? "Rescheduling..." : "Confirm New Time"}
          </Button>
        </div>
      )}
    </Modal>
  );
}

interface CancelProps {
  appt: Appointment | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelAppointmentModal({
  appt,
  loading,
  onClose,
  onConfirm,
}: CancelProps) {
  return (
    <Modal
      isOpen={!!appt}
      onClose={onClose}
      title="Cancel Appointment"
      width="sm"
    >
      {appt && (
        <div className="space-y-5 py-2">
          <div className="flex items-center gap-4 p-4 bg-rose-50/60 rounded-lg border border-rose-100">
            <Avatar src={appt.doctorAvatar} name={appt.doctor} size="md" />
            <div>
              <p className="font-bold text-slate-800 text-sm">{appt.doctor}</p>
              <p className="text-xs text-slate-500 font-medium">
                {appt.date} · {appt.time}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed font-medium text-center">
            Are you sure you want to cancel this appointment? This action cannot
            be undone.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 rounded-lg font-bold text-sm border-slate-200"
              onClick={onClose}
            >
              Keep It
            </Button>
            <Button
              className="h-12 rounded-lg font-bold text-sm bg-rose-500 hover:bg-rose-600 text-white border-none"
              disabled={loading}
              onClick={onConfirm}
              icon={<BiTrash size={16} />}
            >
              {loading ? "Cancelling..." : "Yes, Cancel"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
