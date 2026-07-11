export type AppointmentStatus =
  | "all"
  | "upcoming"
  | "past"
  | "cancelled"
  | "ongoing"
  | "missed"
  | "completed"
  | "scheduled"
  | "in_progress"
  | "requested"
  | "pending";

export type ViewType = "list" | "calendar";

export interface Appointment {
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
  isNew?: boolean;
  computedStatus?: AppointmentStatus;
}

export function parseDuration(durationStr: string | undefined): number {
  if (!durationStr) return 30;
  const val = parseInt(durationStr, 10);
  if (isNaN(val)) return 30;
  if (durationStr.toLowerCase().includes("h")) return val * 60;
  return val;
}
