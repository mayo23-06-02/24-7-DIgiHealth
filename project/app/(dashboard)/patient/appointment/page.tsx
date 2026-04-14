'use client';

import React from 'react';
import AppointmentsView from '@/components/dashboard/patient/AppointmentsView';

export default function PatientAppointmentPage() {
  return (
    <div className="h-[calc(100vh-120px)]">
      <AppointmentsView />
    </div>
  );
}
