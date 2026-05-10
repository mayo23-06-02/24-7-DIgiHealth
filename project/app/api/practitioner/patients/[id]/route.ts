import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { PatientProfile, PractitionerProfile } from '@/lib/models/RoleProfiles';
import { MedicalContext } from '@/lib/models/ClinicalData';
import { Consultation } from '@/lib/models/Consultation';
import Patient from '@/lib/models/Patient';
import mongoose from 'mongoose';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getRequestUser } from '@/lib/auth/getRequestUser';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const userPayload = await getRequestUser();
    if (!userPayload || (userPayload.role !== 'practitioner' && userPayload.role !== 'mega_admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const practitionerId = userPayload.userId;
    const { id: patientUserId } = await params;

    if (!mongoose.Types.ObjectId.isValid(patientUserId)) {
      return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
    }

    // Authorization Check: Is this patient assigned to this practitioner OR has there been a consultation?
    const practitionerProfile = await PractitionerProfile.findOne({ userId: practitionerId }).lean();
    const assignedIds = (practitionerProfile?.assignedPatientIds || []).map(id => id.toString());
    
    const hasConsultation = await Consultation.exists({ patientId: patientUserId, practitionerId });

    if (!assignedIds.includes(patientUserId) && !hasConsultation) {
      return NextResponse.json({ success: false, error: 'Access denied: Patient not linked to your practice' }, { status: 403 });
    }

    // Fetch Patient Data from User, PatientProfile, and MedicalContext
    const user = await User.findById(patientUserId).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    const patientProfile = await PatientProfile.findOne({ userId: patientUserId }).lean();
    const medicalContext = await MedicalContext.findOne({ patientId: patientUserId }).lean();
    const patientBase = await Patient.findOne({ userId: patientUserId }).lean();

    // Past consultations for this patient with THIS practitioner
    const pastConsultations = await Consultation.find({ patientId: patientUserId, practitionerId })
      .sort({ scheduledStartTime: -1 })
      .limit(20)
      .lean();

    // Fetch all prescriptions for this patient
    const { Prescription } = require('@/lib/models/ClinicalData');
    const prescriptions = await Prescription.find({ patientId: patientUserId })
      .sort({ prescribedDate: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        id: user._id.toString(),
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        mobile: user.mobile,
        bloodType: patientBase?.bloodType || 'Unknown',
        dateOfBirth: patientProfile?.dateOfBirth,
        gender: patientProfile?.gender,
        subscriptionTier: patientProfile?.subscriptionTier,
        emergencyContact: patientProfile?.emergencyContact,
        medicalHistory: medicalContext?.chronicConditions || [],
        allergies: (medicalContext?.allergies || []).map((a: any) => a.allergen),
        currentMedications: medicalContext?.currentMedications || [],
        prescriptions: prescriptions.map((p: any) => ({
          id: p._id.toString(),
          medicationName: p.medicationName,
          dosage: p.dosage,
          instructions: p.instructions,
          status: p.status,
          prescribedDate: p.prescribedDate,
          refillsRemaining: p.refillsRemaining,
        })),
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
