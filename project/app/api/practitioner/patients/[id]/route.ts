import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import Consultation from '@/lib/models/Consultation';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
    }

    const patient = await Patient.findById(id).populate('userId').lean();

    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    // Past consultations for this patient
    const pastConsultations = await Consultation.find({ patientId: id })
      .sort({ scheduledStart: -1 })
      .limit(20)
      .lean();

    const userDoc = patient.userId as any;

    return NextResponse.json({
      success: true,
      data: {
        id: patient._id.toString(),
        fullName: userDoc?.profile?.fullName || 'Unknown',
        email: userDoc?.email || '',
        avatarUrl: userDoc?.profile?.avatarUrl || '',
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        mobileNumber: patient.mobileNumber,
        bloodType: patient.bloodType,
        medicalHistory: patient.medicalHistory,
        allergies: patient.allergies,
        currentMedications: patient.currentMedications,
        emergencyContact: patient.emergencyContact,
        pastConsultations: pastConsultations.map((c) => ({
          id: c._id.toString(),
          scheduledStart: c.scheduledStart,
          scheduledEnd: c.scheduledEnd,
          status: c.status,
          type: c.type,
          reason: c.reason,
          riskScore: c.riskScore,
          riskColor: c.riskColor,
          soapNotes: c.soapNotes,
        })),
      },
    });
  } catch (err) {
    console.error('[GET /api/practitioner/patients/[id]]', err);
    return NextResponse.json({ success: false, error: 'Failed to load patient' }, { status: 500 });
  }
}
