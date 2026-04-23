import { NextResponse } from 'next/server';

// SLA targets are configuration-driven. In a full implementation these
// would be stored in a DB collection and editable by hospital admins.
const SLA_TARGETS = [
  { id: '1', name: 'Emergency Response Time', target: '< 8', current: '6.2', unit: 'min', status: 'met', description: 'Time from emergency call to first responder contact' },
  { id: '2', name: 'Outpatient Wait Time', target: '< 30', current: '34', unit: 'min', status: 'at_risk', description: 'Average waiting time for outpatient consultations' },
  { id: '3', name: 'Teleconsultation Connect', target: '< 2', current: '1.4', unit: 'min', status: 'met', description: 'Time for a patient to connect with a practitioner' },
  { id: '4', name: 'Lab Result Turnaround', target: '< 4', current: '5.1', unit: 'hrs', status: 'breached', description: 'Time from sample collection to result delivery' },
  { id: '5', name: 'Appointment Booking', target: '< 24', current: '19', unit: 'hrs', status: 'met', description: 'Lead time to secure a booked appointment slot' },
  { id: '6', name: 'Discharge Processing', target: '< 2', current: '1.8', unit: 'hrs', status: 'met', description: 'Time to process and complete patient discharge' },
];

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: SLA_TARGETS });
  } catch (error) {
    console.error('GET /api/hospital/sla error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch SLA data' }, { status: 500 });
  }
}
