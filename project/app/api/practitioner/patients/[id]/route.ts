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
    // Fetch latest vitals for the patient
    const { Anthropometric } = require('@/lib/models/ClinicalData');
    const latestVitals = await Anthropometric.findOne({ patientId: patientUserId })
      .sort({ dateRecorded: -1 })
      .lean();

    // Latest clinical risk score
    const RiskScore = (await import('@/lib/models/RiskScore')).default;
    const { calcAge, riskBandFromScore, riskBandStyle } = await import('@/lib/riskScore');
    const latestRisk = await RiskScore.findOne({ patientId: patientUserId })
      .sort({ calculatedAt: -1 })
      .lean();
    const consultRisk = pastConsultations.find((c: any) => c.clinicalRisk?.score != null)?.clinicalRisk;
    const riskScore = latestRisk?.score ?? consultRisk?.score ?? 0;
    const riskColor = riskBandFromScore(riskScore);
    const dob = patientProfile?.dateOfBirth || (user as any).dateOfBirth;

    return NextResponse.json({
      success: true,
      data: {
        id: user._id.toString(),
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        mobile: user.mobile,
        bloodType: patientBase?.bloodType || 'Unknown',
        dateOfBirth: dob,
        age: calcAge(dob),
        dateJoined: (user as any).createdAt || null,
        gender: patientProfile?.gender || (user as any).gender,
        riskScore,
        riskColor,
        riskLabel: riskBandStyle(riskScore).label,
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
          documentUrl: p.documentUrl || null,
          documentName: p.documentName || null,
          canDownload: !!p.documentUrl,
        })),
        pastConsultations: pastConsultations.map((c: any) => ({
          id: c._id.toString(),
          scheduledStartTime: c.scheduledStartTime,
          scheduledEndTime: c.scheduledEndTime,
          status: c.status,
          type: c.type,
          chiefComplaint: c.chiefComplaint,
          riskScore: c.clinicalRisk?.score ?? 0,
          riskColor: riskBandFromScore(c.clinicalRisk?.score ?? 0),
          soapNotes: c.soapNotes,
        })),
        vitals: latestVitals ? {
          heartRate: latestVitals.vitalSigns?.heartRateBpm,
          bloodPressure: (latestVitals.vitalSigns?.systolicBP && latestVitals.vitalSigns?.diastolicBP) ? `${latestVitals.vitalSigns.systolicBP}/${latestVitals.vitalSigns.diastolicBP}` : undefined,
          weight: latestVitals.weightKg,
          height: latestVitals.heightCm,
          dateRecorded: latestVitals.dateRecorded
        } : null,
      },
    });
  } catch (err) {
    console.error('[GET /api/practitioner/patients/[id]]', err);
    return NextResponse.json({ success: false, error: 'Failed to load patient detail' }, { status: 500 });
  }
}

/**
 * DELETE — remove patient from this practitioner's assigned list
 * (does not delete the patient account or clinical records)
 */
export async function DELETE(
  _req: NextRequest,
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

    const result = await PractitionerProfile.findOneAndUpdate(
      { userId: practitionerId },
      { $pull: { assignedPatientIds: new mongoose.Types.ObjectId(patientUserId) } },
      { new: true },
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Practitioner profile not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Patient removed from your practice list',
    });
  } catch (err) {
    console.error('[DELETE /api/practitioner/patients/[id]]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to remove patient' },
      { status: 500 },
    );
  }
}
