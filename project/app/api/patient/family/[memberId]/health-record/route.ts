import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { Anthropometric, MedicalContext, Prescription, LabResult, Immunization } from '@/lib/models/ClinicalData';
import { canViewMedicalHistory } from '@/lib/family/access';

/**
 * GET — guardian views a member's clinical record. This is the core privacy
 * boundary of the whole feature: gated by canViewMedicalHistory, which is
 * only true while the member is flagged isMinor. An adult dependent's
 * medical history is never exposed here, regardless of who manages/pays for
 * their account. Response shape matches
 * app/api/practitioner/patients/[id]/health-record/route.ts for consistency.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    await connectToDatabase();
    const guardian = await getRequestUser();
    if (!guardian) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { memberId } = await params;
    if (!(await canViewMedicalHistory(guardian.userId, memberId))) {
      return NextResponse.json(
        { success: false, error: 'This family member is an adult — their medical history is private to them.' },
        { status: 403 },
      );
    }

    const [vitals, medContext, prescriptions, labs, immunizations] = await Promise.all([
      Anthropometric.find({ patientId: memberId }).sort({ dateRecorded: -1 }).lean(),
      MedicalContext.findOne({ patientId: memberId }).lean(),
      Prescription.find({ patientId: memberId }).sort({ prescribedDate: -1 }).lean(),
      LabResult.find({ patientId: memberId }).sort({ dateReported: -1 }).lean(),
      Immunization.find({ patientId: memberId }).sort({ dateAdministered: -1 }).lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        vitals: vitals.map((v: any) => ({
          date: new Date(v.dateRecorded).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
          weight: v.weightKg,
          systolicBP: v.vitalSigns?.systolicBP,
          diastolicBP: v.vitalSigns?.diastolicBP,
          heartRate: v.vitalSigns?.heartRateBpm,
        })),
        labs: labs.map((l: any) => ({
          id: l._id.toString(),
          name: l.testName,
          date: l.dateReported.toISOString(),
          values: (l.parameters || []).map((p: any) => ({
            parameter: p.name,
            value: p.value,
            unit: p.unit,
            referenceRange: p.referenceRange,
            status: p.status,
          })),
        })),
        medications: prescriptions.map((p: any) => ({
          id: p._id.toString(),
          name: p.medicationName,
          dosage: p.dosage,
          instructions: p.instructions,
          prescribedDate: p.prescribedDate?.toISOString?.() || p.prescribedDate,
          status: p.status,
        })),
        allergies: medContext?.allergies || [],
        immunizations: immunizations.map((i: any) => ({
          id: i._id.toString(),
          vaccine: i.vaccineName,
          date: i.dateAdministered.toISOString(),
          dose: i.dosage,
          administeredBy: i.administeredBy,
        })),
      },
    });
  } catch (err: any) {
    console.error('[GET /api/patient/family/[memberId]/health-record]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
