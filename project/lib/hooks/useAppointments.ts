import { useState, useEffect, useCallback, useMemo } from 'react';

export interface Appointment {
  id: string;
  consultationId?: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string;
  practitionerId?: string;
  practitionerName?: string;
  scheduledStart: string; // ISO
  scheduledEnd: string;
  status: string;
  type: string;
  reason?: string;
  riskScore?: number;
  riskColor?: string;
  isNew?: boolean;
  computedStatus?: string;
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
    if (appt.status === 'requested' || appt.status === 'pending') return 'requests';
    if (appt.status === 'in_progress') {
      if (now < end) return 'ongoing';
      return 'past';
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