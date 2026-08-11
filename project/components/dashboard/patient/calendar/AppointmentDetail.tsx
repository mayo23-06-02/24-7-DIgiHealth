import React from "react";
import { BiMap, BiBuilding, BiVideo, BiPencil, BiTrash, BiLoaderAlt, BiTime, BiBell, BiCategory, BiHash } from "react-icons/bi";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

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

interface AppointmentDetailProps {
  appt: Appointment;
  isJoinable: boolean;
  isPersonalEvent: boolean;
  isDeleting: boolean;
  onEdit: (appt: Appointment) => void;
  onDelete: (appt: Appointment) => void;
  onClose: () => void;
}

const AppointmentDetail: React.FC<AppointmentDetailProps> = ({
  appt,
  isJoinable,
  isPersonalEvent,
  isDeleting,
  onEdit,
  onDelete,
  onClose,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center">
        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center text-3xl border border-primary/5 shadow-inner">
          {appt.img ? (
            <img src={appt.img} className="w-full h-full object-cover rounded-lg" alt="" />
          ) : appt.type === "refill" ? (
            "💊"
          ) : appt.type === "reminder" ? (
            "🔔"
          ) : (
            "📅"
          )}
        </div>
        <div>
          <h4 className="text-xl font-bold text-slate-800 font-grotesk">
            {appt.dr || appt.title || (appt.type === "refill" ? "Prescription Refill" : "Event")}
          </h4>
          <p className="text-sm font-bold text-primary mb-1">
            {appt.dr_specialty || appt.type}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge label={appt.date} status="info" variant="soft" />
            <Badge label={appt.time} status="premium" variant="soft" />
            <Badge
              label={appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
              status={appt.status === "confirmed" ? "success" : appt.status === "cancelled" ? "error" : "warning"}
              variant="soft"
            />
            {appt.countdown && <Badge label={appt.countdown} status="neutral" variant="soft" />}
          </div>
        </div>
      </div>

      {(appt.concern || appt.notes) && (
        <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
          <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
            "{appt.concern || appt.notes}"
          </p>
        </div>
      )}

      {appt.type === "refill" && (
        <div className="bg-slate-50 p-4 rounded-lg space-y-2">
          {appt.prescriptionName && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Medication:</span>
              <span className="font-bold">{appt.prescriptionName}</span>
            </div>
          )}
          {appt.deliveryMethod && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Delivery:</span>
              <span className="font-bold capitalize">{appt.deliveryMethod}</span>
            </div>
          )}
          {appt.paymentMethod && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Payment:</span>
              <span className="font-bold capitalize">{appt.paymentMethod}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <BiMap className="text-primary text-lg shrink-0" />
          {appt.location ||
            (appt.type === "refill"
              ? appt.deliveryMethod === "delivery"
                ? appt.deliveryAddress || "To be delivered"
                : "Pickup at pharmacy"
              : "Generic Location")}
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <BiBuilding className="text-primary text-lg shrink-0" />
          {appt.institution || (appt.type === "refill" ? appt.pharmacyId || "Your pharmacy" : "Main Office")}
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <BiCategory className="text-primary text-lg shrink-0" />
          <span className="capitalize">{appt.type}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <BiTime className="text-primary text-lg shrink-0" />
          {appt.durationMinutes ? `${appt.durationMinutes} min duration` : "Duration not set"}
        </div>
        {appt.type === "reminder" && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <BiBell className="text-primary text-lg shrink-0" />
            {appt.reminderDays ? `Remind ${appt.reminderDays} day${appt.reminderDays === 1 ? "" : "s"} before` : "No reminder set"}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <BiHash className="text-primary text-lg shrink-0" />
          <span className="truncate" title={appt.id}>{appt.id.slice(-8).toUpperCase()}</span>
        </div>
      </div>

      <div className="flex gap-3">
        {appt.status === "confirmed" && isJoinable && (
          <Button
            className="flex-1 rounded-lg bg-primary hover:bg-primary/90 text-white shadow-none shadow-primary/30"
            onClick={() => {
              window.location.href = `/patient/messages?autoStart=true&consultationId=${appt.id}`;
            }}
          >
            <BiVideo className="mr-2" /> Join Appointment Room
          </Button>
        )}
        {isPersonalEvent && (
          <>
            <Button
              variant="outline"
              className="flex-1 rounded-lg"
              onClick={() => onEdit(appt)}
            >
              <BiPencil className="mr-2" /> Edit
            </Button>
            <Button
              className="flex-1 rounded-lg"
              disabled={isDeleting}
              onClick={() => onDelete(appt)}
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
        {!isPersonalEvent && (
          <Button className="flex-1 rounded-lg" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
};

export default AppointmentDetail;
