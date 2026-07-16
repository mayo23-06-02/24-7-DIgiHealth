import { useState, useEffect, useCallback, useMemo } from 'react';

export interface Appointment {
  id: string;
  consultationId?: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string;
  practitionerId?: string;
  practitionerName?: string;
  practitionerAvatar?: string;
  scheduledStart: string; // ISO
  scheduledEnd: string;
  status: string;
  type: string;
  reason?: string;
  riskScore?: number;
  riskColor?: string;
  isNew?: boolean;
  computedStatus?: string;
  duration?: string;
  /** True when the current user is the one who can accept/decline this
   * request (i.e. they did not make the last move — the original request
   * or a later reschedule proposal). Undefined for appointments where
   * accept doesn't apply (already scheduled with no pending change, etc). */
  canAccept?: boolean;
  pendingReschedule?: {
    proposedStart: string;
    proposedEnd: string;
    proposedByMe: boolean;
  } | null;
}

export function useAppointments(fetchUrl: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAppointments = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(fetchUrl);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAppointments(prev => {
          const prevIds = new Set(prev.map(a => a.id));
          const newApps = json.data.filter((a: any) => !prevIds.has(a.id));
          return json.data.map((a: any) => ({
            ...a,
            isNew: newApps.some((n: any) => n.id === a.id),
          }));
        });
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error(err);
      setAppointments([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [fetchUrl]);

  // Fetch appointments on mount
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Silently poll so changes made by the other party (reschedule, accept,
  // cancel) show up without a manual reload.
  useEffect(() => {
    const interval = setInterval(() => fetchAppointments(false), 20000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  // Fast-path: NotificationBell dispatches this the moment a new
  // appointment-related notification arrives, so we don't wait for the
  // next 20s poll.
  useEffect(() => {
    const handler = () => fetchAppointments(false);
    window.addEventListener("appointments:changed", handler);
    return () => window.removeEventListener("appointments:changed", handler);
  }, [fetchAppointments]);

  // Compute status based on current time
  const computeStatus = useCallback((appt: Appointment) => {
    const start = new Date(appt.scheduledStart);
    if (isNaN(start.getTime())) return 'past';
    const now = currentTime;
    const duration = 30; // default minutes
    const end = new Date(start.getTime() + duration * 60000);
    const tenMinsAfterStart = new Date(start.getTime() + 10 * 60000);

    if (appt.status === 'cancelled') return 'cancelled';
    if (appt.status === 'completed') return 'past';
    if (appt.status === 'missed') return 'missed';
    // Unaccepted requests past their start time surface as cancelled (server also persists this)
    if (appt.status === 'requested' || appt.status === 'pending') {
      if (now >= start) return 'cancelled';
      return 'requests';
    }
    if (appt.status === 'in_progress') {
      if (now < end) return 'ongoing';
      return 'past';
    }
    // Handle scheduled status - time-based transitions
    if (appt.status === 'scheduled') {
      if (now < start) return 'upcoming';
      if (now >= start && now < tenMinsAfterStart) return 'ongoing';
      if (now >= end) return 'past';
      return 'ongoing';
    }
    if (now < start) return 'upcoming';
    if (now >= start && now < tenMinsAfterStart) return 'ongoing';
    return 'missed';
  }, [currentTime]);

  const appointmentsWithStatus = useMemo(() => {
    return appointments.map(appt => ({
      ...appt,
      computedStatus: computeStatus(appt),
    }));
  }, [appointments, computeStatus]);

  return {
    appointments: appointmentsWithStatus,
    loading,
    fetchAppointments,
    currentTime,
  };
}