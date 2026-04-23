import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { PatientProfile, PractitionerProfile } from '@/lib/models/RoleProfiles';
import { MedicalContext } from '@/lib/models/ClinicalData';
import { Consultation } from '@/lib/models/Consultation';
import mongoose from 'mongoose';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function getPractitionerId(req: NextRequest): Promise<string> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
      const { payload } = await jwtVerify(token, secret);
      const user = await User.findById(payload.userId as string).lean();
      if (user && (user as any).role === 'practitioner') return (user as any)._id.toString();
    }
  } catch {}
  return req.headers.get('x-practitioner-id') || process.env.MOCK_PRACTITIONER_ID || '000000000000000000000000';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const practitionerId = await getPractitionerId(req);
    const { id: patientUserId } = await params;

    if (!mongoose.Types.ObjectId.isValid(patientUserId)) {
      return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
    }

    // Authorization Check: Is this patient assigned to this practitioner?
    const practitionerProfile = await PractitionerProfile.findOne({ userId: practitionerId }).lean();
    const assignedIds = (practitionerProfile?.assignedPatientIds || []).map(id => id.toString());
    
    if (!assignedIds.includes(patientUserId)) {
      return NextResponse.json({ success: false, error: 'Access denied: Patient not assigned to you' }, { status: 403 });
    }

    // Fetch Patient Data from User, PatientProfile, and MedicalContext
    const user = await User.findById(patientUserId).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    const patientProfile = await PatientProfile.findOne({ userId: patientUserId }).lean();
    const medicalContext = await MedicalContext.findOne({ patientId: patientUserId }).lean();

    // Past consultations for this patient with THIS practitioner
    const pastConsultations = await Consultation.find({ patientId: patientUserId, practitionerId })
      .sort({ scheduledStartTime: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        id: user._id.toString(),
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        mobile: user.mobile,
        dateOfBirth: patientProfile?.dateOfBirth,
        gender: patientProfile?.gender,
        subscriptionTier: patientProfile?.subscriptionTier,
        emergencyContact: patientProfile?.emergencyContact,
        medicalHistory: medicalContext?.chronicConditions || [],
        allergies: (medicalContext?.allergies || []).map((a: any) => a.allergen),
        currentMedications: medicalContext?.currentMedications || [],
        pastConsultations: pastConsultations.map((c: any) => ({
          id: c._id.toString(),
          scheduledStartTime: c.scheduledStartTime,
          scheduledEndTime: c.scheduledEndTime,
          status: c.status,
          type: c.type,
          chiefComplaint: c.chiefComplaint,
          riskScore: c.clinicalRisk?.score,
          riskColor: c.clinicalRisk?.color,
          soapNotes: c.soapNotes,
        })),
      },
    });
  } catch (err) {
    console.error('[GET /api/practitioner/patients/[id]]', err);
    return NextResponse.json({ success: false, error: 'Failed to load patient detail' }, { status: 500 });
  }
}
