import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { PatientProfile, PractitionerProfile } from '@/lib/models/RoleProfiles';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const { status } = body;

    if (!['scheduled', 'cancelled'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status update' }, { status: 400 });
    }

    const consultation = await Consultation.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!consultation) {
      return NextResponse.json({ success: false, error: 'Consultation not found' }, { status: 404 });
    }

    // If accepted, mutually link patient and doctor
    if (status === 'scheduled') {
      await Promise.all([
        PractitionerProfile.updateOne(
          { userId: consultation.practitionerId },
          { $addToSet: { assignedPatientIds: consultation.patientId } }
        ),
        PatientProfile.updateOne(
          { userId: consultation.patientId },
          { $addToSet: { myDoctorIds: consultation.practitionerId } }
        )
      ]);
    }

    return NextResponse.json({ success: true, data: consultation });
  } catch (err: any) {
    console.error('[PATCH /api/practitioner/consultations/[id]]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
